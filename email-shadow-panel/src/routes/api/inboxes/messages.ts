import { createFileRoute } from "@tanstack/react-router";

import { createProductionPublicApiDependencies } from "../../../../server/api/composition-root.server.ts";
import { createPublicApiHandlers } from "../../../../server/api/handlers.server.ts";

const handlers = createPublicApiHandlers(createProductionPublicApiDependencies);

export const Route = createFileRoute("/api/inboxes/messages")({
  server: {
    handlers: {
      ANY: async ({ request }) => handlers.handleMessagesRoute(request),
    },
  },
});
