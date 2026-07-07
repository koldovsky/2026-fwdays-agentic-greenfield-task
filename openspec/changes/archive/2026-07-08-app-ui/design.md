# Design: app-ui

## Architecture

```
MainPage (XAML bindings)
    → MainViewModel (CommunityToolkit.Mvvm)
        → IImageInputService (MediaPicker + permissions)
        → IImageAnalysisWorkflow (App orchestrator)
            → IDetectorProvider (lazy ONNX warm-up)
            → Core ImageAnalysisPipeline (detect + overlay PNG)
```

## Boundaries

- **App** owns UI, permissions, MediaPicker, model asset copy to `FileSystem.AppDataDirectory`, and binding annotated PNG bytes to `ImageSource`.
- **Core** owns preprocessing, inference, overlay geometry, and SkiaSharp annotated bitmap encoding.
- App MUST NOT compute crop/box coordinates; it passes encoded image bytes and optional display dimensions (0 = source size).

## NFR Mapping

| ID | Approach |
| --- | --- |
| NFR-STARTUP-01 | `LazyDetectorProvider` creates `TrafficSignDetector` on first analysis, not at app launch. |
| NFR-PERF-01 | `MainViewModel` runs `IImageAnalysisWorkflow.AnalyzeAsync` inside `Task.Run`; UI updates via `IMainThreadDispatcher`. |

## Permissions

- Android: `CAMERA`; remove unused `INTERNET` / `ACCESS_NETWORK_STATE` (offline contract).
- iOS/Mac Catalyst: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`.

## Testability

- Core: `DetectionStatusFormatter`, `ImageAnalysisPipeline` with fake `IDetector`.
- App: `MainViewModel` tests via injected fakes for input/workflow/dispatcher (no platform pickers).
