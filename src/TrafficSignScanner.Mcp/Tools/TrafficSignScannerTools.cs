using System.ComponentModel;
using System.Text.Json;
using ModelContextProtocol;
using ModelContextProtocol.Server;
using TrafficSignScanner.Mcp.Security;
using TrafficSignScanner.Mcp.Services;

namespace TrafficSignScanner.Mcp.Tools;

[McpServerToolType]
public sealed class TrafficSignScannerTools
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly IMcpDetectionService _detectionService;

    public TrafficSignScannerTools(IMcpDetectionService detectionService)
    {
        _detectionService = detectionService ?? throw new ArgumentNullException(nameof(detectionService));
    }

    [McpServerTool(Name = "detect_objects", ReadOnly = true)]
    [Description("Detect supported traffic signs in a local image using the Core ONNX pipeline.")]
    public async Task<string> DetectObjectsAsync(
        [Description("Absolute or relative path to a local JPEG/PNG/WebP/BMP image file.")] string imagePath,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _detectionService
                .DetectObjectsAsync(imagePath, cancellationToken)
                .ConfigureAwait(false);

            return JsonSerializer.Serialize(result, JsonOptions);
        }
        catch (ImagePathValidationException ex)
        {
            throw new McpException(ex.Message);
        }
    }

    [McpServerTool(Name = "get_model_info", ReadOnly = true)]
    [Description("Return ONNX input/output metadata, labels, and confidence threshold for the bundled model.")]
    public string GetModelInfo()
    {
        var result = _detectionService.GetModelInfo();
        return JsonSerializer.Serialize(result, JsonOptions);
    }
}
