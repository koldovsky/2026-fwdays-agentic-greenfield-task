# Card, Tabs & Modal

Layout primitives.

```jsx
<Card interactive onClick={open}>…</Card>
<Tabs tabs={[{value:"all",label:"All",count:24},{value:"pinned",label:"Pinned"}]} value={tab} onChange={setTab} />
<Modal open={open} title="Move to Trash?" onClose={close}
  footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="danger">Delete</Button></>}>
  You can restore this note later.
</Modal>
```

- **Card** — `elevation` 0–5; `interactive` adds hover-lift + pointer.
- **Tabs** — underline style; items can carry `icon` and `count`.
- **Modal** — Esc and backdrop close; sizes sm/md/lg. Uses Lucide `x`.
