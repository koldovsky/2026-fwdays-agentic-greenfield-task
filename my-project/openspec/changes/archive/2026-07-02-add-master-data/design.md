# Design

`lib/master-data.ts` is a pure domain boundary. It clones the aggregate before adding a supplier or updating material settings, rejects duplicate identifiers and invalid limits, and leaves authentication and form parsing at the server-action boundary.

## Verification

Dedicated tests prove valid immutable changes, duplicate/rating rejection, unknown material rejection, and negative-threshold rejection. The real invalid-rating output is also an eval case.
