// @kamerton/bot — the `TelegramTransport` seam (tasks.md 5.1, design.md
// Decision 5). Mirrors `packages/agent`'s `ModelPort` boundary pattern: one
// narrow interface production code (`GrammyTelegramTransport`, a thin real
// grammY adapter) and test code (`testing/fake-telegram-transport.ts`) both
// implement, so `pipeline.ts` never talks to grammY directly.
//
// The interface, `InboundUpdate`'s two shapes, and `GrammyTelegramTransport`
// below have REAL content, not throwing stubs — the same "no behaviour to
// stub, only wiring" shape as `packages/agent/src/model-port.ts` (types +
// a fixed constant, nothing a red test could meaningfully assert against
// without a live call). `GrammyTelegramTransport` specifically is
// deliberately NOT test-covered by this pass: constructing/polling a real
// grammY `Bot` needs a live `TELEGRAM_BOT_TOKEN` and the network — the exact
// "untestable without a token" caveat tasks.md 5.1 names — so it ships as a
// thin, verified-against-the-installed-package (grammy@1.44.0, ctx7
// `/websites/grammy_dev`: `new Bot(token)`, `bot.on("message:text", ...)`,
// `bot.on("callback_query:data", ...)`, `bot.api.sendChatAction`,
// `bot.api.sendMessage`, `ctx.answerCallbackQuery()`) implementation instead
// of a stub, but `pipeline.test.ts` exercises this whole contract entirely
// through `FakeTelegramTransport` (design.md Decision 5), never this class.
// Wiring it into a running process (reading `TELEGRAM_BOT_TOKEN`, calling
// `.start()`) is tasks.md 5.6 — explicitly out of this pass's scope.

import { Bot, InlineKeyboard } from "grammy";

/** Fields every inbound update carries, regardless of shape — auto-captured
 *  from the Telegram update, never asked (FR-INTAKE-01). */
export interface InboundUpdateIdentity {
  telegramUserId: string;
  telegramChatId: string;
  telegramDisplayName?: string;
}

/** A lead's free-text message — the only update shape that ever reaches the
 *  agent loop (design.md Decision 3, step 3). */
export interface InboundTextUpdate extends InboundUpdateIdentity {
  type: "text";
  text: string;
}

/** A tap on an inline-keyboard button this bot itself rendered (a slot
 *  chip, or a format/goal option "ticket", DESIGN.md's "words, not emoji"
 *  buttons) — `data` is the exact `callback_data` payload grammY delivers,
 *  a code-vetted value chosen entirely by the bot's own keyboard (design.md
 *  Decision 3: routing this through the model "would add latency and a
 *  guardrail surface for no benefit" — `tasks.md` 5.4's second bullet: this
 *  update shape NEVER reaches `ModelPort.send()`). The concrete wire format
 *  of `data` (e.g. which prefix maps to which reducer event) is
 *  `pipeline.ts`'s own concern, not fixed by this transport interface. */
export interface InboundCallbackUpdate extends InboundUpdateIdentity {
  type: "callback";
  data: string;
}

export type InboundUpdate = InboundTextUpdate | InboundCallbackUpdate;

/** The only chat action this slice ever sends (NFR-UX-01's immediate typing
 *  acknowledgement) — a closed union rather than a bare string so a future
 *  slice that legitimately needs another action (e.g. `upload_photo`) can
 *  extend it without widening this one's call sites silently. */
export type ChatAction = "typing";

export interface SendMessageOptions {
  /** Inline-keyboard rows (slot chips / format-or-goal "tickets") — `text`
   *  is the visible label, `data` is the `callback_data` this transport
   *  will report back verbatim as a future `InboundCallbackUpdate.data`.
   *  Bot-layer rendering concern (design.md Decision 3): `pipeline.ts`
   *  decides WHEN a keyboard is owed for the current conversation state;
   *  this transport only renders whatever it is given. */
  buttons?: Array<Array<{ text: string; data: string }>>;
}

/**
 * The seam `pipeline.ts` calls through instead of grammY directly.
 * Production: `GrammyTelegramTransport` (below). Test:
 * `FakeTelegramTransport` (`testing/fake-telegram-transport.ts`) — records
 * every call and lets a test simulate an inbound update, so exact outbound
 * call order (ack-before-reply, NFR-UX-01) is assertable without a live
 * Telegram chat.
 */
export interface TelegramTransport {
  sendChatAction(chatId: string, action: ChatAction): Promise<void>;
  sendMessage(chatId: string, text: string, options?: SendMessageOptions): Promise<void>;
  /** Registers the ONE handler this transport calls for every inbound
   *  update (text or callback) it receives from Telegram. Calling this more
   *  than once replaces the previous handler — this slice only ever wires
   *  one (`pipeline.ts`'s `handleUpdate`, partially applied over `deps`). */
  onMessage(handler: (update: InboundUpdate) => Promise<void>): void;
}

function toInlineKeyboard(
  buttons: SendMessageOptions["buttons"],
): InlineKeyboard | undefined {
  if (buttons === undefined || buttons.length === 0) {
    return undefined;
  }
  const keyboard = new InlineKeyboard();
  buttons.forEach((row, rowIndex) => {
    for (const button of row) {
      keyboard.text(button.text, button.data);
    }
    if (rowIndex < buttons.length - 1) {
      keyboard.row();
    }
  });
  return keyboard;
}

/**
 * Thin, real grammY-backed production `TelegramTransport` (long polling,
 * NFR-LOCAL-01). No business logic lives here — every method is a direct
 * pass-through to the corresponding grammY/Bot API call, mapping grammY's
 * own context shapes onto this package's `InboundUpdate` union. Auth: the
 * caller supplies `token` (read from `TELEGRAM_BOT_TOKEN` — a later wiring
 * task, tasks.md 5.6 — never hardcoded here, NFR-SEC-01).
 */
export class GrammyTelegramTransport implements TelegramTransport {
  private readonly bot: Bot;
  private handler: ((update: InboundUpdate) => Promise<void>) | undefined;

  constructor(token: string) {
    this.bot = new Bot(token);

    this.bot.on("message:text", async (ctx) => {
      if (this.handler === undefined) {
        return;
      }
      await this.handler({
        type: "text",
        telegramUserId: String(ctx.from.id),
        telegramChatId: String(ctx.chat.id),
        telegramDisplayName: ctx.from.first_name,
        text: ctx.message.text,
      });
    });

    this.bot.on("callback_query:data", async (ctx) => {
      if (this.handler !== undefined) {
        await this.handler({
          type: "callback",
          telegramUserId: String(ctx.from.id),
          telegramChatId: String(ctx.chat?.id ?? ctx.from.id),
          telegramDisplayName: ctx.from.first_name,
          data: ctx.callbackQuery.data,
        });
      }
      // Telegram protocol hygiene: acknowledge the tap so the client clears
      // its loading spinner. An implementation detail of THIS transport
      // only — `pipeline.ts` never needs to know a callback query was
      // "answered"; it is not part of the `TelegramTransport` interface.
      await ctx.answerCallbackQuery();
    });
  }

  async sendChatAction(chatId: string, action: ChatAction): Promise<void> {
    await this.bot.api.sendChatAction(chatId, action);
  }

  async sendMessage(chatId: string, text: string, options?: SendMessageOptions): Promise<void> {
    const keyboard = toInlineKeyboard(options?.buttons);
    await this.bot.api.sendMessage(chatId, text, keyboard ? { reply_markup: keyboard } : undefined);
  }

  onMessage(handler: (update: InboundUpdate) => Promise<void>): void {
    this.handler = handler;
  }

  /** Thin pass-throughs over grammY's own `Bot.start()`/`stop()` — no
   *  business logic — kept here so tasks.md 5.6's wiring task never needs
   *  to reach past this adapter into the raw grammY `Bot`. Not part of the
   *  `TelegramTransport` interface (production-lifecycle concern only). */
  async start(): Promise<void> {
    await this.bot.start();
  }

  async stop(): Promise<void> {
    await this.bot.stop();
  }
}
