Centered dialog on a blurred scrim, e.g. for the "Add TV by IP address" flow.

```jsx
<Modal open={open} onClose={close} title="Add a TV" footer={<Button variant="primary">Connect</Button>}>
  <Input label="IP Address" icon="lan" value={ip} onChange={setIp} />
</Modal>
```
