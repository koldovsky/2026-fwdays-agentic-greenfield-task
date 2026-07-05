import type { FastifyInstance } from 'fastify';
import { INPUT_KEYS, type InputsModule, type SamsungInputKey } from '../tv/inputs.js';

interface InputParams {
  udn: string;
}

interface InputBody {
  key: SamsungInputKey;
}

// Fastify schema — invalid `key` goes down errorHandler's
// `error.validation` branch and lands as `code: "validation"`
// (matches the spec.md "Unknown key rejected" scenario).
const inputBodySchema = {
  type: 'object',
  required: ['key'],
  additionalProperties: false,
  properties: {
    key: { type: 'string', enum: INPUT_KEYS as readonly string[] },
  },
};

export function registerInputRoutes(inputs: InputsModule) {
  return async function (app: FastifyInstance): Promise<void> {
    app.get<{ Params: InputParams }>(
      '/devices/:udn/inputs',
      async () => {
        return { inputs: inputs.list() };
      },
    );

    app.post<{ Params: InputParams; Body: InputBody }>(
      '/devices/:udn/input',
      { schema: { body: inputBodySchema } },
      async (request, reply) => {
        const { udn } = request.params;
        const { key } = request.body;
        await inputs.switch(udn, key);
        reply.code(204).send();
      },
    );
  };
}
