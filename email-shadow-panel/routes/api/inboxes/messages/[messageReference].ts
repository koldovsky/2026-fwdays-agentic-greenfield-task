import { defineHandler } from "nitro";
import { getRouterParam } from "nitro/h3";

import { createProductionPublicApiDependencies } from "../../../../server/api/composition-root.server.ts";
import { createPublicApiHandlers } from "../../../../server/api/handlers.server.ts";

const handlers = createPublicApiHandlers(createProductionPublicApiDependencies);

export default defineHandler((event) =>
  handlers.handleMessageDetailRoute(event.req, {
    messageReference: getRouterParam(event, "messageReference"),
  }),
);