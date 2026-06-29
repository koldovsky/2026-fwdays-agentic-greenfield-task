Underline tabs for switching views on a book page (Notes / Summary / Links) or filtering a shelf.

```jsx
<Tabs items={[
  { value: 'notes', label: 'Notes', count: 24 },
  { value: 'summary', label: 'Summary' },
  { value: 'links', label: 'Links', count: 6 },
]} defaultValue="notes" onChange={setTab} />
```
