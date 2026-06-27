Confirmation modal — used for "Approve report?" and "Launch cycle?".

```jsx
<Dialog title="Approve report?" onClose={close}
  actions={<><Button variant="ghost" onClick={close}>Cancel</Button>
            <Button onClick={confirm}>Approve</Button></>}>
  Approving locks the report. The raw dialogs stay private to HR.
</Dialog>
```

Scrim `rgba(26,26,24,.45)`, white card (440px max) with the dialog shadow. Body copy is muted, calm, one short paragraph. Actions right-aligned: ghost/secondary cancel + primary confirm.
