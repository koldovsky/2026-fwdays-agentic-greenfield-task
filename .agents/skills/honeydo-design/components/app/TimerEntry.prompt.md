The core Honeydo loop element — one time-entry row. Shows description, tag, elapsed time, and a play/stop button. The running entry glows amber.

```jsx
<TimerEntry description="Design review" tag="Design" tagColor="#F5A300" duration="1:24:08" running onContinue={stop} />
<TimerEntry description="Inbox" tag="Admin" tagColor="#7BC57F" duration="32m" onContinue={resume} />
```

Set `running` for the live entry (amber glow + Stop square). Otherwise the button is a Play to resume that task.
