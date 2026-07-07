import type { FastifyInstance } from 'fastify';
import { DELTA_MAX_MAGNITUDE, type VolumeModule } from '../tv/volume.js';

interface VolumeParams {
  udn: string;
}

interface VolumeDeltaBody {
  delta: number;
}

// Fastify's Ajv schema validation feeds through `error.validation` in
// errorHandler, which returns `{code: "validation"}` — the exact envelope
// the spec's "Delta of 0 rejected" and "Out-of-range delta rejected"
// scenarios require. Handling both the zero and range checks here means
// the route path emits `"validation"` uniformly.
const deltaBodySchema = {
  type: 'object',
  required: ['delta'],
  additionalProperties: false,
  properties: {
    delta: {
      type: 'integer',
      minimum: -DELTA_MAX_MAGNITUDE,
      maximum: DELTA_MAX_MAGNITUDE,
      not: { const: 0 },
    },
  },
};

export function registerVolumeRoutes(volume: VolumeModule) {
  return async function (app: FastifyInstance): Promise<void> {
    app.get<{ Params: VolumeParams }>(
      '/devices/:udn/volume',
      async (request) => {
        const { udn } = request.params;
        return volume.get(udn);
      },
    );

    app.post<{ Params: VolumeParams; Body: VolumeDeltaBody }>(
      '/devices/:udn/volume/delta',
      { schema: { body: deltaBodySchema } },
      async (request, reply) => {
        const { udn } = request.params;
        // Fastify's schema (above) has already enforced integer / non-zero /
        // magnitude bounds — any invalid body was rejected upstream with
        // `code: "validation"`. `validateDelta` in the volume module stays
        // as the unit-testable core of the same rules.
        await volume.delta(udn, request.body.delta);
        reply.code(204).send();
      },
    );

    app.post<{ Params: VolumeParams }>(
      '/devices/:udn/mute',
      async (request, reply) => {
        const { udn } = request.params;
        await volume.toggleMute(udn);
        reply.code(204).send();
      },
    );

    // 404 on unknown UDN is handled inside the volume module (via
    // `sessionManager.ensure(udn)` returning undefined → HttpError.notFound).
  };
}
