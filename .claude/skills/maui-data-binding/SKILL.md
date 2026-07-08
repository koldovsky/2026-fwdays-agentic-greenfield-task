---
name: maui-data-binding
description: >-
  Guidance for .NET MAUI XAML data bindings, compiled bindings, value converters,
  binding modes, multi-binding, relative bindings, and MVVM best practices.
  USE FOR: "data binding", "compiled binding", "value converter", "IValueConverter",
  "binding mode", "TwoWay binding", "multi-binding", "relative binding",
  "BindingContext", "MVVM binding", "INotifyPropertyChanged".
  DO NOT USE FOR: CollectionView item templates (use maui-collectionview),
  Shell navigation data passing (use maui-shell-navigation), or dependency injection (use maui-dependency-injection).
---

# .NET MAUI Data Binding

## Don't specify redundant binding modes

Set `Mode` explicitly **only** when overriding the default. Most properties already have the right default:

```xml
<!-- ✅ Defaults — omit Mode -->
<Label Text="{Binding Score}" />           <!-- OneWay is the default -->
<Entry Text="{Binding UserName}" />        <!-- TwoWay is the default -->
<Switch IsToggled="{Binding DarkMode}" />  <!-- TwoWay is the default -->

<!-- ✅ Override when needed -->
<Label Text="{Binding Title, Mode=OneTime}" />
<Entry Text="{Binding SearchQuery, Mode=OneWayToSource}" />

<!-- ❌ Redundant — just noise -->
<Label Text="{Binding Score, Mode=OneWay}" />
<Entry Text="{Binding UserName, Mode=TwoWay}" />
```

## Compiled bindings — x:DataType placement rules

Compiled bindings are **8–20× faster** than reflection-based bindings. Enable with `x:DataType`.

**Place `x:DataType` only where `BindingContext` is set:**

1. **Page root** — where you assign `BindingContext`.
2. **DataTemplate** — which creates a new binding scope.

Do **not** scatter `x:DataType` on child elements. Adding `x:DataType="x:Object"` on children to "escape" compiled bindings is an anti-pattern — it disables compile-time checking and reintroduces reflection.

```xml
<!-- ✅ Correct: x:DataType only where BindingContext is set -->
<ContentPage x:DataType="vm:MainViewModel">
    <StackLayout>
        <Label Text="{Binding Title}" />
        <Slider Value="{Binding Progress}" />
    </StackLayout>
</ContentPage>

<!-- ❌ Wrong: x:DataType scattered on children -->
<ContentPage x:DataType="vm:MainViewModel">
    <StackLayout>
        <Label Text="{Binding Title}" />
        <Slider x:DataType="x:Object" Value="{Binding Progress}" />
    </StackLayout>
</ContentPage>
```

**DataTemplate always needs its own `x:DataType`:**

```xml
<CollectionView ItemsSource="{Binding People}">
    <CollectionView.ItemTemplate>
        <DataTemplate x:DataType="model:Person">
            <Label Text="{Binding FullName}" />
        </DataTemplate>
    </CollectionView.ItemTemplate>
</CollectionView>
```

### Treat compiler warnings as errors in CI

| Warning | Meaning |
|---------|---------|
| **XC0022** | Binding path not found on the declared `x:DataType` |
| **XC0023** | Property is not bindable |
| **XC0024** | `x:DataType` type not found |
| **XC0025** | Binding used without `x:DataType` (non-compiled fallback) |

```xml
<WarningsAsErrors>XC0022;XC0025</WarningsAsErrors>
```

## .NET 9+ compiled code bindings

Fully AOT-safe, no reflection:

```csharp
label.SetBinding(Label.TextProperty,
    static (PersonViewModel vm) => vm.FullName);

entry.SetBinding(Entry.TextProperty,
    static (PersonViewModel vm) => vm.Age,
    mode: BindingMode.TwoWay,
    converter: new IntToStringConverter());
```

## Threading caveat

MAUI automatically marshals `PropertyChanged` to the UI thread — you can raise it from any thread. **However**, direct `ObservableCollection` mutations (Add/Remove) from background threads may still crash:

```csharp
// ✅ Safe for PropertyChanged
await Task.Run(() => Items = LoadData());

// ⚠️ ObservableCollection.Add — dispatch to UI thread
MainThread.BeginInvokeOnMainThread(() => Items.Add(newItem));
```

## Performance tips

- **Compiled bindings** eliminate reflection — always prefer them.
- **NativeAOT / trimming**: Reflection-based bindings break under trimming. Compiled bindings (XAML `x:DataType` or code `SetBinding` with lambdas) are trimmer- and AOT-safe.
- Use **`OneTime` mode** for truly static data to skip change-tracking registration.
- Avoid complex converter chains in hot paths — pre-compute values in the ViewModel instead.
