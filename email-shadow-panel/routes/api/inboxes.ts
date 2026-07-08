import { defineHandler } from "nitro";

import { createProductionPublicApiDependencies } from "../../server/api/composition-root.server.ts";
import { createPublicApiHandlers } from "../../server/api/handlers.server.ts";

const handlers = createPublicApiHandlers(createProductionPublicApiDependencies);

export default defineHandler((event) => handlers.handleInboxesRoute(event.req));