import type { Clock } from "../session/clock.server.ts";
import { messageReferenceSchema } from "../session/contracts.server.ts";
import { DomainError } from "../session/errors.server.ts";
import { extractTrustedClientIpHash } from "./client-ip.server.ts";
import {
  publicCreateInboxResponseSchema,
  publicHealthResponseSchema,
  publicListMessagesResponseSchema,
  publicMessageDetailResponseSchema,
} from "./contracts.server.ts";
import { createRequestId, type PublicApiLogger } from "./diagnostics.server.ts";
import {
  assertNoRequestBody,
  assertNoUnexpectedQuery,
  assertSameOrigin,
  createJsonResponse,
  createMethodNotAllowedResponse,
  createNoContentResponse,
  createPublicErrorResponse,
  createRequestDeadlineSignal,
  extractBearerCapability,
  normalizePublicApiError,
} from "./http.server.ts";
import type { ActiveInboxLimiter } from "./active-inbox-limit.server.ts";
import type { PublicApiConfig } from "./config.server.ts";
import type { OperationLockManager } from "./operation-lock.server.ts";
import type { RateLimiter } from "./rate-limit.server.ts";
import { resolveAnonymousVisitorCookie } from "./visitor-cookie.server.ts";
import type { AnonymousSessionService } from "../session/service.server.ts";
import type { VisitorHashService } from "../session/visitor-hash.server.ts";

export interface PublicApiDependencies {
  config: PublicApiConfig;
  clock: Clock;
  logger?: PublicApiLogger;
  sessionService: AnonymousSessionService;
  visitorHashService: VisitorHashService;
  rateLimiter: RateLimiter;
  activeInboxLimiter: ActiveInboxLimiter;
  operationLockManager: OperationLockManager;
}

export interface PublicApiHandlers {
  handleHealthRoute(request: Request): Promise<Response>;
  handleInboxesRoute(request: Request): Promise<Response>;
  handleMessagesRoute(request: Request): Promise<Response>;
  handleMessageDetailRoute(
    request: Request,
    params: { messageReference?: string },
  ): Promise<Response>;
}

export function createPublicApiHandlers(
  dependenciesFactory: () => PublicApiDependencies | Promise<PublicApiDependencies>,
  options?: { requestIdGenerator?: () => string },
): PublicApiHandlers {
  const requestIdGenerator = options?.requestIdGenerator ?? createRequestId;

  async function logRequest(
    dependencies: PublicApiDependencies | undefined,
    route: string,
    request: Request,
    requestId: string,
    startedAtMs: number,
    response: Response,
    errorCode?: string,
  ): Promise<void> {
    await dependencies?.logger?.log({
      requestId,
      route,
      method: request.method,
      status: response.status,
      durationMs: Date.now() - startedAtMs,
      errorCode,
    });
  }

  async function withRouteHandling(
    request: Request,
    route: string,
    allowedMethods: string[],
    handler: (dependencies: PublicApiDependencies) => Promise<Response>,
  ): Promise<Response> {
    const requestId = requestIdGenerator();
    const startedAtMs = Date.now();
    let dependencies: PublicApiDependencies | undefined;

    try {
      if (!allowedMethods.includes(request.method)) {
        const response = createMethodNotAllowedResponse(requestId, allowedMethods);
        await logRequest(
          undefined,
          route,
          request,
          requestId,
          startedAtMs,
          response,
          "METHOD_NOT_ALLOWED",
        );
        return response;
      }

      dependencies = await dependenciesFactory();
      const response = await handler(dependencies);
      await logRequest(dependencies, route, request, requestId, startedAtMs, response);
      return response;
    } catch (error) {
      const normalized = normalizePublicApiError(error, requestId);
      const response = createPublicErrorResponse(
        normalized.envelope,
        normalized.status,
        normalized.headers,
      );
      await logRequest(
        dependencies,
        route,
        request,
        requestId,
        startedAtMs,
        response,
        normalized.envelope.code,
      );
      return response;
    }
  }

  function requireProviderEnabled(dependencies: PublicApiDependencies): void {
    if (!dependencies.config.providerEnabled) {
      throw new DomainError("PROVIDER_DISABLED", "The inbox provider is disabled.", {
        safeMessage: "The inbox provider is temporarily unavailable.",
      });
    }
  }

  async function enforceRateLimit(
    dependencies: PublicApiDependencies,
    input: { scope: string; key: string; limit: number; windowMs: number },
  ): Promise<void> {
    const result = await dependencies.rateLimiter.consume(input);
    if (result.status === "limited") {
      throw new DomainError("RATE_LIMITED", "The request exceeded the configured rate limit.", {
        safeMessage: "Too many requests were sent.",
        details: {
          retryAfterSeconds: result.retryAfterSeconds,
        },
      });
    }
  }

  async function handleCreateInbox(
    dependencies: PublicApiDependencies,
    request: Request,
  ): Promise<Response> {
    assertNoUnexpectedQuery(request);
    assertSameOrigin(request);
    await assertNoRequestBody(request);
    requireProviderEnabled(dependencies);

    const visitorCookie = resolveAnonymousVisitorCookie(request, {
      name: dependencies.config.visitorCookieName,
      maxAgeSeconds: dependencies.config.visitorCookieMaxAgeSeconds,
      secure: dependencies.config.secureVisitorCookie,
    });
    const visitorHash = dependencies.visitorHashService.hashVisitorIdentifier(visitorCookie.value);
    const { clientIpHash } = extractTrustedClientIpHash(request, dependencies.visitorHashService);

    await enforceRateLimit(dependencies, {
      scope: "create-visitor",
      key: visitorHash,
      limit: dependencies.config.createLimitPerVisitor,
      windowMs: dependencies.config.createWindowMs,
    });
    await enforceRateLimit(dependencies, {
      scope: "create-ip",
      key: clientIpHash,
      limit: dependencies.config.createLimitPerIp,
      windowMs: dependencies.config.createWindowMs,
    });

    const reservation = await dependencies.activeInboxLimiter.reserve({
      anonymousVisitorHash: visitorHash,
      limit: dependencies.config.maxActiveInboxesPerVisitor,
      ttlMs: dependencies.config.activeInboxReservationTtlMs,
    });
    if (reservation.status === "limit_reached" || !reservation.reservationId) {
      throw new DomainError(
        "ACTIVE_INBOX_LIMIT_REACHED",
        "The visitor has too many active inboxes.",
        {
          safeMessage: "The active inbox limit has been reached.",
        },
      );
    }

    const deadline = createRequestDeadlineSignal(
      request.signal,
      dependencies.config.requestTimeoutMs,
    );
    try {
      const created = await dependencies.sessionService.createSession({
        visitorIdentifier: visitorCookie.value,
        signal: deadline.signal,
      });
      const responseBody = publicCreateInboxResponseSchema.parse({
        data: {
          capabilityToken: created.capabilityToken,
          inbox: {
            address: created.session.inboxAddress,
            createdAt: created.session.createdAt,
            updatedAt: created.session.updatedAt,
            expiresAt: created.session.expiresAt,
          },
        },
      });
      const headers = visitorCookie.setCookieHeader
        ? { "Set-Cookie": visitorCookie.setCookieHeader }
        : undefined;
      return createJsonResponse(responseBody, 201, headers);
    } finally {
      deadline.dispose();
      await dependencies.activeInboxLimiter.release({
        anonymousVisitorHash: visitorHash,
        reservationId: reservation.reservationId,
      });
    }
  }

  async function handleDeleteInbox(
    dependencies: PublicApiDependencies,
    request: Request,
  ): Promise<Response> {
    assertNoUnexpectedQuery(request);
    assertSameOrigin(request);
    await assertNoRequestBody(request);
    const capability = extractBearerCapability(request);

    try {
      await dependencies.sessionService.deleteSession(capability.capabilityToken);
    } catch (error) {
      if (
        error instanceof DomainError &&
        (error.code === "SESSION_NOT_FOUND" || error.code === "SESSION_EXPIRED")
      ) {
        return createNoContentResponse();
      }
      throw error;
    }

    return createNoContentResponse();
  }

  async function withCapabilityLock<TResponse>(
    dependencies: PublicApiDependencies,
    request: Request,
    capabilityTokenHash: string,
    work: (signal: AbortSignal) => Promise<TResponse>,
  ): Promise<TResponse> {
    const lock = await dependencies.operationLockManager.acquire({
      key: capabilityTokenHash,
      ttlMs: dependencies.config.operationLockTtlMs,
    });
    if (lock.status !== "acquired" || !lock.token) {
      throw new DomainError(
        "OPERATION_IN_PROGRESS",
        "Another session operation is already running.",
        {
          safeMessage: "Another inbox operation is already in progress.",
          details: {
            retryAfterSeconds: lock.retryAfterSeconds,
          },
        },
      );
    }

    const deadline = createRequestDeadlineSignal(
      request.signal,
      dependencies.config.requestTimeoutMs,
    );
    try {
      return await work(deadline.signal);
    } finally {
      deadline.dispose();
      await dependencies.operationLockManager.release({
        key: capabilityTokenHash,
        token: lock.token,
      });
    }
  }

  async function handleListMessages(
    dependencies: PublicApiDependencies,
    request: Request,
  ): Promise<Response> {
    assertNoUnexpectedQuery(request);
    await assertNoRequestBody(request);
    requireProviderEnabled(dependencies);
    const capability = extractBearerCapability(request);

    await enforceRateLimit(dependencies, {
      scope: "read-capability",
      key: capability.capabilityTokenHash,
      limit: dependencies.config.readLimitPerCapability,
      windowMs: dependencies.config.readWindowMs,
    });

    return withCapabilityLock(
      dependencies,
      request,
      capability.capabilityTokenHash,
      async (signal) => {
        const listed = await dependencies.sessionService.listMessages(capability.capabilityToken, {
          signal,
        });
        const responseBody = publicListMessagesResponseSchema.parse({
          data: {
            inbox: {
              address: listed.session.inboxAddress,
              createdAt: listed.session.createdAt,
              updatedAt: listed.session.updatedAt,
              expiresAt: listed.session.expiresAt,
            },
            messages: listed.messages,
          },
        });
        return createJsonResponse(responseBody);
      },
    );
  }

  async function handleMessageDetail(
    dependencies: PublicApiDependencies,
    request: Request,
    params: { messageReference?: string },
  ): Promise<Response> {
    assertNoUnexpectedQuery(request);
    await assertNoRequestBody(request);
    requireProviderEnabled(dependencies);
    const capability = extractBearerCapability(request);
    const parsedMessageReference = messageReferenceSchema.safeParse(params.messageReference);
    if (!parsedMessageReference.success) {
      throw new DomainError(
        "INVALID_REQUEST",
        "The message reference path parameter was invalid.",
        {
          safeMessage: "The request is invalid.",
        },
      );
    }
    const messageReference = parsedMessageReference.data;

    await enforceRateLimit(dependencies, {
      scope: "read-capability",
      key: capability.capabilityTokenHash,
      limit: dependencies.config.readLimitPerCapability,
      windowMs: dependencies.config.readWindowMs,
    });

    return withCapabilityLock(
      dependencies,
      request,
      capability.capabilityTokenHash,
      async (signal) => {
        const detail = await dependencies.sessionService.getMessageDetail(
          capability.capabilityToken,
          messageReference,
          { signal },
        );
        const responseBody = publicMessageDetailResponseSchema.parse({
          data: {
            inbox: {
              address: detail.session.inboxAddress,
              createdAt: detail.session.createdAt,
              updatedAt: detail.session.updatedAt,
              expiresAt: detail.session.expiresAt,
            },
            message: {
              reference: messageReference,
              ...detail.detail,
            },
          },
        });
        return createJsonResponse(responseBody);
      },
    );
  }

  return {
    async handleHealthRoute(request: Request) {
      if (request.method !== "GET") {
        return createMethodNotAllowedResponse(requestIdGenerator(), ["GET"]);
      }

      try {
        assertNoUnexpectedQuery(request);
        await assertNoRequestBody(request);
        const dependencies = await dependenciesFactory();
        return createJsonResponse(
          publicHealthResponseSchema.parse({
            data: {
              status: dependencies.config.providerEnabled ? "ok" : "degraded",
            },
          }),
        );
      } catch {
        return createJsonResponse(
          publicHealthResponseSchema.parse({
            data: {
              status: "degraded",
            },
          }),
        );
      }
    },
    handleInboxesRoute(request: Request) {
      return withRouteHandling(request, "inboxes", ["POST", "DELETE"], async (dependencies) => {
        if (request.method === "POST") {
          return handleCreateInbox(dependencies, request);
        }

        return handleDeleteInbox(dependencies, request);
      });
    },
    handleMessagesRoute(request: Request) {
      return withRouteHandling(request, "messages", ["GET"], async (dependencies) => {
        return handleListMessages(dependencies, request);
      });
    },
    handleMessageDetailRoute(request: Request, params: { messageReference?: string }) {
      return withRouteHandling(request, "message-detail", ["GET"], async (dependencies) => {
        return handleMessageDetail(dependencies, request, params);
      });
    },
  };
}
