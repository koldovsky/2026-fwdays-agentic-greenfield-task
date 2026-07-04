using TrafficSignScanner.Core;

namespace TrafficSignScanner.Core.Tests;

public sealed class HarnessSmokeTests
{
    [Fact]
    public void Core_project_is_referenced_by_test_harness()
    {
        Assert.Equal("TrafficSignScanner.Core", typeof(CoreAssemblyMarker).Namespace);
    }
}
