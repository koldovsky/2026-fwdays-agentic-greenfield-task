# Requirements --- Samsung TV Controller

This document is the source of truth for product requirements.

Each requirement has a stable identifier.

-   **FR** --- Functional Requirements
-   **NFR** --- Non-functional Requirements
-   **BC** --- Business Constraints

------------------------------------------------------------------------

# Functional Requirements

## Device Discovery

**FR-DISCOVERY-01**\
The application shall automatically discover Samsung televisions using
UPnP.

**FR-DISCOVERY-02**\
Discovery shall start automatically during application startup.

**FR-DISCOVERY-03**\
Discovery shall continue periodically every 30 seconds.

**FR-DISCOVERY-04**\
When a television disappears from the network it shall be marked as
**Offline**.

**FR-DISCOVERY-05**\
Duplicate televisions shall never appear in the device list.

------------------------------------------------------------------------

## Service Discovery (mDNS)

**FR-MDNS-01**\
The application shall advertise itself using mDNS.

**FR-MDNS-02**\
The advertised hostname shall be `mytv.local`.

**FR-MDNS-03**\
The mDNS advertisement shall automatically recover after network
changes.

------------------------------------------------------------------------

## Application Hosting

**FR-HOSTING-01**\
The backend shall serve the built front-end SPA as static assets on
the same origin as the HTTP API and WebSocket.

**FR-HOSTING-02**\
The application shall be reachable at `http://mytv.local/` from any
browser on the same local network without additional client
configuration.

**FR-HOSTING-03**\
Unknown SPA routes shall fall back to `index.html` so client-side
routing and deep links resolve correctly.

------------------------------------------------------------------------

## TV Connection

**FR-CONNECTION-01**\
The application shall establish an IP Control connection to a selected
television.

**FR-CONNECTION-02**\
Only one active connection per television shall exist.

**FR-CONNECTION-03**\
The application shall automatically reconnect after an unexpected
disconnect.

**FR-CONNECTION-04**\
The UI shall display one of the following states:

-   Connected
-   Connecting
-   Disconnected
-   Offline

------------------------------------------------------------------------

## Remote Control

**FR-REMOTE-01**\
The user shall be able to send Samsung remote control key presses.

**FR-REMOTE-02**\
The backend shall support every Samsung IP Control key implemented by
the project.

**FR-REMOTE-03**\
Commands shall return success or failure to the UI.

**FR-REMOTE-04**\
Remote controls shall be disabled while disconnected.

------------------------------------------------------------------------

## Volume Control

**FR-VOLUME-01**\
Increase volume.

**FR-VOLUME-02**\
Decrease volume.

**FR-VOLUME-03**\
Mute and unmute.

**FR-VOLUME-04**\
Display the current volume level when supported.

------------------------------------------------------------------------

## Input Management

**FR-INPUT-01**\
Display available inputs.

**FR-INPUT-02**\
Allow changing the active input.

**FR-INPUT-03**\
Refresh available inputs on demand.

------------------------------------------------------------------------

## Browser

**FR-BROWSER-01**\
Launch a URL in the TV's built-in Tizen web browser from the SPA.

**FR-BROWSER-02**\
Validate the URL server-side (scheme and parse) before forwarding to the TV.

**FR-BROWSER-03**\
Disable the browser-launch control while the session is not connected.

------------------------------------------------------------------------

## User Interface

**FR-UI-01**\
Display all discovered televisions.

**FR-UI-02**\
Display connection status.

**FR-UI-03**\
Display television name.

**FR-UI-04**\
Display IP address.

**FR-UI-05**\
Display model information when available.

------------------------------------------------------------------------

## Error Handling

**FR-ERROR-01**\
Communication failures shall be presented to the user.

**FR-ERROR-02**\
Network failures shall never crash the application.

**FR-ERROR-03**\
Unexpected protocol messages shall be logged.

------------------------------------------------------------------------

## Deployment

**FR-DEPLOY-01**\
The deploy story shall ship a single build script (`scripts/build.sh`,
covered by `FR-BUILD-01`) whose output — the compiled back-end and
front-end `dist/` directories — is the artefact the install script
consumes. Build and install are separate scripts; running the install
script does not compile anything.

**FR-DEPLOY-02**\
The install script shall install a systemd service unit that runs the
back-end (`node back-end/dist/index.js`) with the production environment
the back-end expects (`PORT=80`, `NODE_ENV=production`, `SERVE_SPA=1`).

**FR-DEPLOY-03**\
The installed service shall start automatically on boot
(`systemctl enable`, `WantedBy=multi-user.target`) and shall restart on
failure.

**FR-DEPLOY-04**\
The install script shall be idempotent: re-running it on an
already-installed host shall reload the systemd unit only if it changed
and restart the service without leaving orphan state.

**FR-DEPLOY-05**\
The install script shall refuse to run — with a clear error naming the
missing path and pointing at `scripts/build.sh` — if either
`back-end/dist/index.js` or `front-end/dist/index.html` is not present
on disk. No systemd state shall be modified on this failure path.

**FR-DEPLOY-06**\
The install script shall install production-only runtime dependencies
for the back-end via `npm ci --omit=dev` inside `back-end/`, so the dev
toolchain (TypeScript, Vite, vitest, bats) is not required on the target
host.

## Build

**FR-BUILD-01**\
A single Bash script (`scripts/build.sh`) shall build both packages
(`npm run install:all`, back-end `tsc`, and front-end Vite build) and
produce `back-end/dist/index.js` and `front-end/dist/index.html`. The
build script shall not require root, shall not touch systemd state, and
shall be runnable on macOS or Linux — build artefacts are pure JS and
portable across architectures.

------------------------------------------------------------------------

# Non-functional Requirements

**NFR-01**\
Backend shall be implemented using Node.js.

**NFR-02**\
Frontend shall be implemented using React.

**NFR-03**\
The application shall run on Orange Pi.

**NFR-04**\
The backend shall expose a REST API.

**NFR-05**\
The frontend shall communicate using HTTP and WebSocket.

**NFR-06**\
The application shall function without Internet connectivity.

**NFR-07**\
Memory usage should remain below 300 MB under normal operation.

**NFR-08**\
The application should start within 15 seconds.

------------------------------------------------------------------------

# Business Constraints

**BC-01**\
Internet access is not required.

**BC-02**\
Only Samsung televisions are supported in the MVP.

**BC-03**\
The application shall operate entirely within a local network.

**BC-04**\
No user authentication in the MVP.

**BC-05**\
No cloud services.

------------------------------------------------------------------------

# Out of Scope

-   User accounts
-   Cloud synchronization
-   Home Assistant integration
-   Voice assistants
-   Automation rules
-   Plugins
-   Mobile applications
