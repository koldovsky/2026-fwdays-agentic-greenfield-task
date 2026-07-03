// Notely UI kit — top-level app shell + state.
function NotelyApp() {
  const [theme, setTheme] = React.useState("light");
  const [active, setActive] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [layout, setLayout] = React.useState("grid");
  const [openId, setOpenId] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  React.useEffect(() => {
    window.lucide && window.lucide.createIcons();
  });

  const notes = window.NotelyData.notes.filter((n) =>
    query === "" ? true : (n.title + " " + n.snippet).toLowerCase().includes(query.toLowerCase())
  );
  const openNote = window.NotelyData.notes.find((n) => n.id === openId);

  function newNote() {
    setToast("New note created");
    setTimeout(() => setToast(null), 2400);
  }

  let view;
  if (active === "settings") {
    view = <window.SettingsView dark={theme === "dark"} onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} />;
  } else if (openNote) {
    view = <window.EditorView note={openNote} onBack={() => setOpenId(null)} />;
  } else {
    view = <window.NotesView notes={notes} query={query} onQuery={setQuery} layout={layout} onLayout={setLayout} onOpen={setOpenId} />;
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "var(--font-sans)" }}>
      <window.Sidebar active={active} onSelect={(id) => { setActive(id); setOpenId(null); }} onNew={newNote} />
      {view}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 1300 }}>
          <window.NotelyDesignSystem_fd4cb3.Toast message={toast} tone="success" onDismiss={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}

window.NotelyApp = NotelyApp;
