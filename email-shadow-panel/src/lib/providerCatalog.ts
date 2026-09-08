import type { ProviderId } from "@/types/inbox";

export interface ProviderDefinition {
  id: ProviderId | "temp-mail" | "guerrilla-mail";
  name: string;
  description: string;
  badge: string;
  available: boolean;
  iconKind: "mail";
}

export const PROVIDERS: ProviderDefinition[] = [
  {
    id: "emailnator",
    name: "Emailnator",
    description: "Fast, reliable, and ready to use.",
    badge: "Online",
    available: true,
    iconKind: "mail",
  },
  {
    id: "temp-mail",
    name: "Temp-Mail",
    description: "Rotating aliases across many domains.",
    badge: "Coming soon",
    available: false,
    iconKind: "mail",
  },
  {
    id: "guerrilla-mail",
    name: "Guerrilla Mail",
    description: "Long-lived throwaway inboxes.",
    badge: "Coming soon",
    available: false,
    iconKind: "mail",
  },
];
