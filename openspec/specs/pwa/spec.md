# pwa Specification

## Purpose

Make the app installable to the home screen and able to load offline after the first visit via a web app manifest and a service worker, scoped strictly to installability and offline caching — with no background push or reminders while the app is closed.

## Requirements

### Requirement: Installable web app manifest
The system SHALL provide a web app manifest enabling install to the home screen, with a
name, icons, theme color, and `display: standalone` (backs FR-PWA-01).

#### Scenario: Manifest enables install
- **WHEN** the app is loaded over the production URL in a supporting browser
- **THEN** the manifest is served with name, icons, theme color, and `display: standalone`, and the install prompt is available

### Requirement: Offline app shell
The system SHALL register a service worker that caches the app shell so the app loads
offline after the first successful load (backs FR-PWA-02).

#### Scenario: Loads offline after first visit
- **WHEN** the user has loaded the app once and then goes offline
- **THEN** the app shell loads from the service-worker cache without a network connection

### Requirement: Installability/offline only — no background push
The system SHALL limit the service worker to installability and offline caching, and
SHALL NOT use background push or run reminders while the app is closed (backs FR-PWA-03).

#### Scenario: No background push registered
- **WHEN** the service worker is installed
- **THEN** it registers no push or background-sync handlers and fires no reminders while the app is closed
