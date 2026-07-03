// Notely UI kit — sample data (fake content for the recreation).
window.NotelyData = {
  folders: [
    { id: "all", name: "All notes", icon: "layout-grid", count: 12 },
    { id: "recent", name: "Recent", icon: "clock", count: 5 },
    { id: "fav", name: "Favorites", icon: "star", count: 3 },
    { id: "shared", name: "Shared with me", icon: "users", count: 2 },
  ],
  myFolders: [
    { id: "personal", name: "Personal", color: "#4f46e5", count: 6 },
    { id: "work", name: "Work", color: "#0d9488", count: 4 },
    { id: "ideas", name: "Ideas", color: "#d97706", count: 2 },
  ],
  tags: [
    { label: "writing", color: "#4f46e5" },
    { label: "research", color: "#0d9488" },
    { label: "todo", color: "#d97706" },
  ],
  notes: [
    { id: 1, title: "Weekly review — June", snippet: "Three wins, one lesson, and the single most important thing to focus on next week. Shipping the editor felt great.", date: "2 min ago", folder: "Work", tags: [{ label: "writing", color: "#4f46e5" }], pinned: true, favorite: true, color: "#4f46e5",
      body: "Three wins, one lesson, and the single most important thing to focus on next week.\n\nShipping the editor felt great — the team rallied and we cut scope intelligently.\n\nNext week: polish sync conflicts." },
    { id: 2, title: "Q3 product roadmap", snippet: "Themes: speed, collaboration, and offline. Each theme gets one headline feature and two supporting bets.", date: "1 hr ago", folder: "Work", tags: [{ label: "research", color: "#0d9488" }], pinned: true, favorite: false, color: "#0d9488",
      body: "Themes: speed, collaboration, and offline.\n\nEach theme gets one headline feature and two supporting bets." },
    { id: 3, title: "Reading list", snippet: "Books and essays worth a second pass this quarter. Mostly design + systems thinking.", date: "Yesterday", folder: "Personal", tags: [], pinned: false, favorite: true, color: "#4f46e5",
      body: "Books and essays worth a second pass this quarter." },
    { id: 4, title: "Trip planning — Lisbon", snippet: "Neighborhoods, day trips, and a short list of places to eat. Flexible itinerary, no overbooking.", date: "Mon", folder: "Personal", tags: [{ label: "todo", color: "#d97706" }], pinned: false, favorite: false, color: "#d97706",
      body: "Neighborhoods, day trips, and a short list of places to eat." },
    { id: 5, title: "Meeting notes — sync", snippet: "Decisions, owners, and follow-ups from the weekly sync. Archived after action items closed.", date: "Mar 4", folder: "Work", tags: [], pinned: false, favorite: false, color: "#0d9488",
      body: "Decisions, owners, and follow-ups from the weekly sync." },
    { id: 6, title: "App ideas", snippet: "A running list of small tools I'd actually use. Filter by effort vs. delight.", date: "Mar 1", folder: "Ideas", tags: [{ label: "writing", color: "#4f46e5" }], pinned: false, favorite: false, color: "#d97706",
      body: "A running list of small tools I'd actually use." },
  ],
};
