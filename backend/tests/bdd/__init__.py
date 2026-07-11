"""Backend BDD test package — pytest-bdd bindings for the F1 feature.

The F1 ``epub-upload-and-validation.feature`` is symlinked from
``docs/features/`` so the BDD suite stays in lock-step with the executable
acceptance contract. Plan 02 binds the 6 @api + 3 @integration scenarios
(non-@web — Playwright drives the @web scenarios in Plan 03).
"""
