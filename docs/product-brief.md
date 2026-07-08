# Product Brief: Traffic Sign Scanner

## Summary

Traffic Sign Scanner is a small offline edge-AI mobile app that detects selected traffic signs in a photo using a locally bundled Azure Custom Vision ONNX object-detection model.

The app focuses on a narrow, demo-friendly scope: capture or pick an image, run local inference, and show detected signs with confidence and overlay geometry.

## Why Local Inference

- Privacy: selected photos stay on the device.
- Latency: detection does not wait on a network round trip.
- Reliability: the detector works offline.
- Cost control: no cloud prediction endpoint, API key, or per-call billing is required.

## Target User Flow

1. The user captures a photo or selects one from local storage.
2. The app crops the image to a centered square, resizes it to `320x320`, and creates an ONNX tensor.
3. The bundled model runs through ONNX Runtime.
4. The app shows detected signs, confidence scores, and an annotated preview.

## Supported Classes

The bundled model currently recognizes:

- `no-entry`
- `parking-prohibited`
- `stop-sign`

Negative eval images are used to verify that unrelated scenes and confusing red signs do not produce false detections.

## Non-Goals

- Real-time camera stream detection.
- Cloud prediction fallback.
- Training or retraining from inside the app.
- Broad traffic-sign taxonomy beyond the exported model labels.
- Emulator UI automation as the primary verification strategy.

## Evidence Focus

This repository demonstrates the engineering process as much as the product:

- Static and dynamic context.
- Stable requirements and OpenSpec scenarios.
- Test-first implementation loops.
- Output evals against real photos.
- Maker/checker separation.
- Traceability from requirements to specs, tests, code, evals, and commits.
