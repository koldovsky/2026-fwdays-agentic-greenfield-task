Composed row for the device list screen: TV glyph tile, name + model/IP metadata, status Badge, chevron. Lifts slightly on hover.

```jsx
<DeviceCard name="Living Room" model="OrbitCast X1" ip="192.168.1.42" status="online" onClick={openRemote} />
```

Composes `Card` + `Badge` — an intentional addition (source defines no components) added for the device-list screen.
