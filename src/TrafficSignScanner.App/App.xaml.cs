using Microsoft.Extensions.DependencyInjection;

namespace TrafficSignScanner
{
    public partial class App : Application
    {
        public App()
        {
            InitializeComponent();
        }

        protected override Window CreateWindow(IActivationState? activationState)
        {
            var services = IPlatformApplication.Current?.Services
                ?? throw new InvalidOperationException("MAUI services are unavailable.");
            var shell = services.GetRequiredService<AppShell>();
            return new Window(shell);
        }
    }
}
