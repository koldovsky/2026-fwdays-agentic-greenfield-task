# route-segmentation

## Purpose

Deterministic, pure-function segmentation of a route polyline into rest stops, overnight points, and multi-day travel groups with distance metrics. Implements FR-VIEW-02 computation semantics, TC-PURE-01, TC-TEST-01, and NFR-PERF-02.

## Requirements

### Requirement: Pure segmentation boundary

The route engine SHALL expose segmentation logic as pure TypeScript functions under `lib/route-engine/` with no DOM, network, or environment globals in the computation path.

#### Scenario: Callable without browser APIs

- **WHEN** `segmentRoute` is invoked with a valid polyline and constraints in a Node test environment
- **THEN** it returns an itinerary result without accessing `window`, `document`, or `fetch`

#### Scenario: Invalid input returns error result

- **WHEN** `segmentRoute` is invoked with fewer than two polyline coordinates or non-positive constraint values
- **THEN** it returns a structured error result without throwing an exception

### Requirement: Polyline distance calculation

The engine SHALL compute route distance along the input polyline using haversine distance between consecutive coordinate pairs.

#### Scenario: Total distance matches polyline length

- **WHEN** a fixture polyline with known geometric length is segmented
- **THEN** `itinerary.totalDistanceKm` equals the sum of haversine leg distances within acceptable floating-point tolerance

### Requirement: Rest stop placement

The engine SHALL place rest stops along the route at intervals of `restKm` riding distance measured from the start, excluding the start and end terminal points.

#### Scenario: Regular rest intervals on a long route

- **WHEN** a route of 450 km is segmented with `restKm` of 150
- **THEN** the itinerary includes rest stops at approximately 150 km and 300 km from the start
- **THEN** each rest stop has kind `rest` and a valid lat/lon on the polyline

#### Scenario: Short route without intermediate rests

- **WHEN** a route shorter than `restKm` is segmented
- **THEN** the itinerary contains no rest stops between start and end

### Requirement: Travel day splitting

The engine SHALL group route progress into travel days such that riding distance within each day does not exceed `dayKm`, marking an overnight stop at each day boundary before the final destination.

#### Scenario: Multi-day split

- **WHEN** a route of 900 km is segmented with `dayKm` of 400
- **THEN** the itinerary spans three travel days
- **THEN** each day except the last includes an overnight stop of kind `overnight`
- **THEN** each day's `distanceKm` does not exceed `dayKm` except within floating-point tolerance

#### Scenario: Single-day route

- **WHEN** a route whose total distance is less than or equal to `dayKm` is segmented
- **THEN** `totalDays` is 1
- **THEN** no overnight stops are emitted

### Requirement: Itinerary output contract

The engine SHALL return a structured itinerary containing a flat chronological stop list, per-day groupings with distance metrics, and per-day polyline slices suitable for downstream map and sidebar consumers.

#### Scenario: Stop ordering and terminal markers

- **WHEN** segmentation completes successfully
- **THEN** the first stop has kind `start` and the last stop has kind `end`
- **THEN** all stops include `distanceFromStartKm`, `dayIndex`, `lat`, and `lon`
- **THEN** `restStopCount` equals the number of stops with kind `rest`

#### Scenario: Per-day polyline slices

- **WHEN** an itinerary spans multiple travel days
- **THEN** each entry in `days` includes a `polyline` coordinate array for that day's distance range
- **THEN** the union of day polylines covers the full route without gaps beyond interpolation tolerance

### Requirement: Unit test verification

The route engine SHALL include Vitest unit tests with fixture polylines that run without network access and assert deterministic stop placement and day boundaries.

#### Scenario: Fixture-based regression tests

- **WHEN** `npm test` runs in a clean checkout
- **THEN** route engine tests pass using only local fixture data
- **THEN** tests cover rest placement, day splitting, and invalid input handling

### Requirement: Segmentation performance

The engine SHALL complete segmentation on a representative dense polyline (approximately 2000 coordinate pairs) in under 50 milliseconds on a typical developer machine.

#### Scenario: Performance budget

- **WHEN** the performance test fixture is segmented
- **THEN** wall-clock time for `segmentRoute` is less than 50 ms
