# Design: mcp-server

## Architecture

```
TrafficSignScannerTools (MCP attributes)
    → IMcpDetectionService
        → IImagePathValidator (security gate)
        → IMcpDetectorProvider (lazy TrafficSignDetector)
        → IRepositoryPaths (model/labels/repo root)
```

## Security

- Resolve `imagePath` with `Path.GetFullPath`.
- Require existing regular file with allowed image extension (`.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp`).
- Reject empty paths, directories, and oversize files before read/inference.
- Model path is fixed relative to repository root — not user-supplied.

## Tool Contracts

| Tool | Input | Output |
| --- | --- | --- |
| `detect_objects` | `imagePath: string` | JSON detections (label, confidence, normalized box) |
| `get_model_info` | none | JSON model metadata per `docs/model-contract.md` |

Errors use `McpException` with structured messages; invalid paths skip inference.
