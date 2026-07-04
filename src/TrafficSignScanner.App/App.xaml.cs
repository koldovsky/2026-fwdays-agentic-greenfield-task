using Microsoft.Extensions.DependencyInjection;
#if ANDROID
using Android.Runtime;
#endif

namespace TrafficSignScanner.App
{
    public partial class App : Application
    {
#if ANDROID
        public App(IntPtr handle, JniHandleOwnership transfer)
            : base(handle, transfer)
        {
        }
#endif

        public App()
        {
            InitializeComponent();
        }

        protected override Window CreateWindow(IActivationState? activationState)
        {
            return new Window(new AppShell());
        }
    }
}