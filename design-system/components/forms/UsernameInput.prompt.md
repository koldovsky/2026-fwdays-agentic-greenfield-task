Text input for a GitHub login, with inline validation error. Border goes danger-red when `error` is set (e.g. "User not found").

```jsx
<UsernameInput value={login} onChange={setLogin} error={err} onSubmit={validate} />
```
