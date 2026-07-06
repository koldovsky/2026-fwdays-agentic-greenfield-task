import { useEffect, useState, useSyncExternalStore } from "react";
import { createBrowserInboxController, type InboxController } from "@/lib/inboxController";

export function useInboxController(): InboxController {
  const [controller] = useState(() => createBrowserInboxController());

  useEffect(() => {
    controller.initialize();
    return () => controller.dispose();
  }, [controller]);

  return controller;
}

export function useInboxControllerState(controller: InboxController) {
  return useSyncExternalStore(
    (listener) => controller.subscribe(listener),
    () => controller.getState(),
    () => controller.getState(),
  );
}
