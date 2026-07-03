# HybridWebView API Reference

## Project Layout

Place web assets under **Resources/Raw/wwwroot** (the default root). Set a
different root with the `HybridRootComponent` property if needed.

```
Resources/Raw/wwwroot/
  index.html        ← entry point (default)
  scripts/app.js
  styles/app.css
```

## XAML Setup

```xml
<HybridWebView
    x:Name="myHybridWebView"
    DefaultFile="index.html"
    RawMessageReceived="OnRawMessageReceived"
    HorizontalOptions="Fill"
    VerticalOptions="Fill" />
```

`DefaultFile` sets the HTML page loaded on start (defaults to `index.html`).

## index.html Structure

The page **must** include the bridge script before any app scripts:

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body>
  <!-- app markup -->
  <script src="_hwv/HybridWebView.js"></script>
  <script src="scripts/app.js"></script>
</body>
</html>
```

## C# → JavaScript (InvokeJavaScriptAsync)

Call a JS function from C# and receive a typed result:

```csharp
// JS: function addNumbers(a, b) { return a + b; }
var result = await myHybridWebView.InvokeJavaScriptAsync<int>(
    "addNumbers",
    MyJsonContext.Default.Int32,       // return type info
    [2, 3],                            // parameters
    [MyJsonContext.Default.Int32,      // param 1 type info
     MyJsonContext.Default.Int32]);    // param 2 type info
```

For complex types:

```csharp
var person = await myHybridWebView.InvokeJavaScriptAsync<Person>(
    "getPerson",
    MyJsonContext.Default.Person,
    [id],
    [MyJsonContext.Default.Int32]);
```

## JavaScript → C# (InvokeDotNet)

From JS, call a C# method exposed on the invoke target:

```javascript
const result = await window.HybridWebView.InvokeDotNet('MethodName', [param1, param2]);
window.HybridWebView.InvokeDotNet('LogEvent', ['click', 'button1']); // fire-and-forget
```

### Setting the Invoke Target

Register the object whose public methods JS can call:

```csharp
myHybridWebView.SetInvokeJavaScriptTarget(new MyJsBridge());

public class MyJsBridge
{
    public string Greet(string name) => $"Hello, {name}!";
    public Person GetPerson(int id) => new Person { Id = id, Name = "Ada" };
}
```

Method parameters and return values are serialized as JSON.

## Raw Messages

For unstructured string communication use raw messages instead of typed interop.

**C# → JS:**
```csharp
myHybridWebView.SendRawMessage("payload string");
```

**JS → C#:**
```javascript
window.HybridWebView.SendRawMessage('payload string');
```

**Receiving in C#:**
```csharp
void OnRawMessageReceived(object sender, HybridWebViewRawMessageReceivedEventArgs e)
{
    var message = e.Message;
}
```

**Receiving in JS:**
```javascript
window.addEventListener('HybridWebViewMessageReceived', e => {
    const message = e.detail.message;
});
```

## JSON Serialization Setup

Use **source-generated** JSON serialization. Define a partial context covering
every type exchanged between JS and C#:

```csharp
[JsonSourceGenerationOptions(
    WriteIndented = false,
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(int))]
[JsonSerializable(typeof(string))]
[JsonSerializable(typeof(Person))]
internal partial class MyJsonContext : JsonSerializerContext { }

public class Person
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
```

## JS Exception Forwarding (.NET 9+)

JavaScript exceptions thrown during `InvokeJavaScriptAsync` are automatically
forwarded to .NET as managed exceptions. Wrap calls in try/catch:

```csharp
try
{
    var result = await myHybridWebView.InvokeJavaScriptAsync<string>(
        "riskyFunction", MyJsonContext.Default.String);
}
catch (Exception ex)
{
    Debug.WriteLine($"JS error: {ex.Message}");
}
```

## Trimming and NativeAOT

Trimming and NativeAOT are **disabled by default** in MAUI projects. If you
enable them, ensure JSON source generators are used:

```xml
<PropertyGroup>
  <PublishTrimmed>true</PublishTrimmed>
  <JsonSerializerIsReflectionEnabledByDefault>false</JsonSerializerIsReflectionEnabledByDefault>
</PropertyGroup>
```

Using `JsonSerializerContext` (source generation) as shown above is the
recommended pattern regardless of trimming settings.
