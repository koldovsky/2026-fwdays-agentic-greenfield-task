Product Brief — Samsung TV Controller

Companion to docs/requirements.md. This document describes the product vision, business goals, and user experience. Technical implementation details belong in the architecture and requirements documents.

What this is

Samsung TV Controller is a lightweight self-hosted service that runs on an Orange Pi inside a local network and provides a simple web interface for discovering and controlling Samsung Smart TVs.

The application consists of a Node.js backend and a React-based frontend. The backend serves the compiled frontend as static assets on the same origin as the HTTP API and WebSocket, so the whole product is reachable through a single URL. Users access the application through any browser on the same local network. The service advertises itself using mDNS as mytv.local, allowing users to connect without knowing the device’s IP address.

The application automatically discovers compatible Samsung TVs using UPnP and communicates with them using Samsung’s IP Control protocol. Televisions that are not discovered automatically can also be added manually by entering their IP address. No cloud services or Internet connectivity are required during normal operation.

The goal is to provide a fast, reliable, and privacy-friendly way to control Samsung televisions from any device on the local network.

⸻

Who it is for

The product is intended for anyone who needs convenient browser-based control of Samsung televisions within a local network.

Typical users include:

* Home users with one or more Samsung TVs.
* AV installers configuring televisions.
* System integrators.
* Developers building automation around Samsung displays.
* Small businesses using Samsung TVs for signage or meeting rooms.

There are no user accounts or roles in the MVP. Anyone who can access the local network can use the application.

⸻

The pain it addresses

Controlling Samsung televisions programmatically is often difficult.

Existing solutions usually require proprietary software, cloud accounts, mobile applications, or complicated network configuration. Integrating Samsung TVs into automation systems frequently involves reverse-engineering protocols and writing custom discovery logic.

This application removes that complexity.

Users simply open http://mytv.local, immediately see available televisions, and can begin controlling them without configuration.

⸻

Product vision

The application should feel like a dedicated remote control that happens to run inside a browser.

A user should be able to power on the application, discover televisions automatically, select one, and control it within seconds.

The experience should require no documentation, no installation on client devices, and no cloud connectivity.

⸻

End-to-end usage

1. The Orange Pi starts the service.
2. The service announces itself on the local network using mDNS as mytv.local.
3. A user opens http://mytv.local in any modern browser; the backend serves the SPA and the API from the same origin.
4. The backend automatically discovers Samsung TVs using UPnP.
5. The UI displays all discovered televisions.
6. The user selects a television, or adds one manually by entering its IP address if it was not discovered automatically.
7. The application establishes an IP Control connection.
8. The user controls the TV through the web interface.
9. Commands are sent immediately, and the UI reflects the current connection state.

⸻

Core workflows

Discover televisions

The application continuously discovers Samsung TVs available on the local network and keeps the list updated as devices appear or disappear.

Add a television manually

If a television is not discovered automatically, the user can add it by entering its IP address. Manually added televisions are treated the same as discovered ones once they respond.

Connect to a television

Selecting a television establishes an IP Control session. The application manages connection state automatically and reconnects when possible.

Control the television

The user can perform common actions, including:

* Volume up/down
* Mute
* Channel navigation
* Remote control key presses
* Input switching
* Power control (where supported)
* Launch supported applications (future)

Commands should execute with minimal latency.

Monitor device status

The UI displays whether a television is online, offline, connecting, or unavailable, allowing users to understand the current state without guesswork.

⸻

MVP

The first release includes:

* Node.js backend
* React frontend
* Automatic discovery using UPnP
* Manual addition of a television by IP address
* mDNS advertisement (mytv.local)
* Samsung IP Control communication
* List of discovered televisions
* Connect/disconnect management
* Remote control buttons
* Volume control
* Mute
* Input selection
* Connection status
* Responsive web interface
* Local network deployment on Orange Pi

⸻

Future scope

The following features are intentionally out of scope for the MVP:

* User authentication
* Cloud connectivity
* Remote Internet access
* Mobile applications
* Firmware updates
* Macros and automation
* Scheduling
* Multi-user permissions
* HDMI-CEC integration
* Voice assistants
* Plugin system
* TV grouping
* Analytics

⸻

Product principles

* Local-first operation.
* No cloud dependency.
* Zero configuration whenever possible.
* Automatic device discovery.
* Fast command execution.
* Reliable communication.
* Simple and responsive user interface.
* Privacy-first.
* Easy deployment on low-power hardware.
* Recover gracefully from network interruptions.

⸻

Success metrics

The product is considered successful when:

* A new installation becomes accessible through mytv.local without manual network configuration.
* Compatible Samsung TVs appear automatically.
* Users can start controlling a television within one minute.
* Commands execute with minimal noticeable delay.
* Device discovery remains reliable while TVs join or leave the network.
* The application runs continuously on an Orange Pi with low resource usage.

⸻

Constraints

* Runs on Orange Pi.
* Backend implemented in Node.js.
* Frontend implemented in React.
* Communication occurs only within the local network.
* Television discovery uses UPnP.
* Service discovery uses mDNS.
* Television communication uses Samsung IP Control.
* Modern desktop and mobile browsers are supported.
* Internet access is not required for normal operation.

⸻

Risks

* Differences between Samsung TV models and firmware versions.
* Network configurations that block UPnP or mDNS.
* Televisions becoming temporarily unreachable.
* Changes in Samsung’s IP Control behavior across firmware releases.
* Wi-Fi instability causing intermittent connectivity.
