using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;
using TrafficSignScanner.Mcp.Security;
using TrafficSignScanner.Mcp.Services;
using TrafficSignScanner.Mcp.Tools;

var builder = Host.CreateApplicationBuilder(args);

builder.Logging.AddConsole(options =>
{
    options.LogToStandardErrorThreshold = LogLevel.Trace;
});

builder.Services.AddSingleton<IRepositoryPaths, RepositoryPaths>();
builder.Services.AddSingleton<IImagePathValidator, ImagePathValidator>();
builder.Services.AddSingleton<IMcpDetectorProvider, McpDetectorProvider>();
builder.Services.AddSingleton<IMcpDetectionService, McpDetectionService>();

builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithTools<TrafficSignScannerTools>();

await builder.Build().RunAsync();
