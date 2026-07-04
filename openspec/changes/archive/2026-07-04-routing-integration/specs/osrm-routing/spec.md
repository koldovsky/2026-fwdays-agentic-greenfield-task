# osrm-routing

## Purpose

Client-side fetch of route geometry from a keyless public OSRM instance for use by the segmentation engine. Implements TC-DATA-01 (OSRM leg), TC-STACK-04, and NFR-COST-01.

## ADDED Requirements

### Requirement: Browser OSRM route fetch

The application SHALL fetch route geometry between two geocoded coordinates using a CORS-compliant public OSRM HTTP API from the browser without API keys.

#### Scenario: Successful route request

- **WHEN** valid start and end coordinates are provided to the OSRM client
- **THEN** the client requests a driving route from the public OSRM endpoint
- **THEN** the response is parsed without using server-side proxies

#### Scenario: OSRM request failure

- **WHEN** the OSRM endpoint returns a non-success HTTP status or an empty route list
- **THEN** the client returns a structured routing error without throwing an exception
- **THEN** no error is written to the browser console in the normal error path

### Requirement: GeoJSON geometry decoding

The OSRM client SHALL decode OSRM GeoJSON route geometry into an ordered array of `{ lat, lon }` coordinates suitable for `segmentRoute`.

#### Scenario: Coordinate order normalization

- **WHEN** OSRM returns geometry coordinates as `[lon, lat]` pairs
- **THEN** the decoder produces `LatLon` objects with correct latitude and longitude fields
- **THEN** the decoded polyline contains at least two points

#### Scenario: Invalid geometry response

- **WHEN** the OSRM response lacks a usable route geometry
- **THEN** the client returns a structured routing error indicating no route geometry

### Requirement: Abort in-flight requests

The OSRM client SHALL support cancellation of in-flight requests when a newer route planning action starts.

#### Scenario: Superseded request

- **WHEN** a second OSRM request is initiated while a prior request is still pending
- **THEN** the prior request is aborted via `AbortSignal`
- **THEN** the aborted request does not update itinerary state
