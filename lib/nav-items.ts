export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
};

export const primaryNavItems: NavItem[] = [
  { id: "all", label: "All notes", href: "/notes", icon: "inbox" },
  { id: "search", label: "Search", href: "/search", icon: "search" },
  { id: "favorites", label: "Favorites", href: "/favorites", icon: "star" },
  { id: "pinned", label: "Pinned", href: "/pinned", icon: "pin" },
  { id: "archive", label: "Archive", href: "/archive", icon: "archive" },
];

export const bottomNavItems: NavItem[] = [
  { id: "trash", label: "Trash", href: "/trash", icon: "trash-2" },
  { id: "settings", label: "Settings", href: "/settings", icon: "settings" },
];
