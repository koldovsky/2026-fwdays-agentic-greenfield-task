export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
};

export const primaryNavItems: NavItem[] = [
  { id: "all", label: "All notes", href: "/notes", icon: "inbox" },
  { id: "favorites", label: "Favorites", href: "/favorites", icon: "star" },
  { id: "pinned", label: "Pinned", href: "/pinned", icon: "pin" },
  { id: "archive", label: "Archive", href: "/archive", icon: "archive" },
];

export const bottomNavItems: NavItem[] = [
  { id: "trash", label: "Trash", href: "/trash", icon: "trash-2" },
  { id: "settings", label: "Settings", href: "/settings", icon: "settings" },
];

export const placeholderFolders = [
  { name: "Work", color: "#4F46E5", count: 0 },
  { name: "Personal", color: "#059669", count: 0 },
];

export const placeholderTags = ["ideas", "planning", "reading"];
