# ADR-0002: Raw Pixel Tensor

## Status

Accepted

## Context

The exported Custom Vision compact ONNX model expects `image_tensor` with shape `float32[1,3,320,320]`. Many image-classification examples normalize pixels to `0..1`, but this model subtracts `127.5` internally.

## Decision

Preprocessing will write raw RGB channel values in the `0..255` range into an NCHW tensor. It will not divide by `255`, subtract means, or apply external normalization.

## Consequences

- Unit tests must assert representative tensor cells contain raw channel values.
- Agents must consult `docs/model-contract.md` before changing preprocessing.
- If a future model export changes preprocessing requirements, this ADR and the model contract must be updated together.
