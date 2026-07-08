using Microsoft.Extensions.Logging;
using TrafficSignScanner.Services;
using TrafficSignScanner.ViewModels;

namespace TrafficSignScanner
{
    public static class MauiProgram
    {
        public static MauiApp CreateMauiApp()
        {
            var builder = MauiApp.CreateBuilder();
            builder
                .UseMauiApp<App>()
                .ConfigureFonts(fonts =>
                {
                    fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                    fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
                });

            builder.Services.AddSingleton<IModelAssetService, ModelAssetService>();
            builder.Services.AddSingleton<IDetectorProvider, LazyDetectorProvider>();
            builder.Services.AddSingleton<IImageInputService, MauiImageInputService>();
            builder.Services.AddSingleton<IImageAnalysisWorkflow, ImageAnalysisWorkflow>();
            builder.Services.AddSingleton<IMainThreadDispatcher, MauiMainThreadDispatcher>();
            builder.Services.AddTransient<MainViewModel>();
            builder.Services.AddTransient<MainPage>();
            builder.Services.AddSingleton<AppShell>();

#if DEBUG
            builder.Logging.AddDebug();
#endif

            return builder.Build();
        }
    }
}
