namespace TrafficSignScanner
{
    public partial class AppShell : Shell
    {
        public AppShell(MainPage mainPage)
        {
            InitializeComponent();

            Items.Add(new ShellContent
            {
                Title = "Scanner",
                Content = mainPage,
                Route = "MainPage",
            });
        }
    }
}
