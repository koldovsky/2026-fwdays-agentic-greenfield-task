---
name: maui-collectionview
description: >
  Guidance for implementing CollectionView in .NET MAUI apps — data display,
  layouts (list & grid), selection, grouping, scrolling, empty views, templates,
  incremental loading, swipe actions, and pull-to-refresh.
  USE FOR: "CollectionView", "list view", "grid layout", "data template",
  "item template", "grouping", "pull to refresh", "incremental loading",
  "swipe actions", "empty view", "selection mode", "scroll to item".
  DO NOT USE FOR: simple static layouts (use maui-data-binding),
  map pin lists (use maui-maps), or table-based data entry forms.
---

# CollectionView – .NET MAUI

Use `CollectionView` for displaying scrollable lists and grids of data.
It replaces `ListView` and offers better performance, flexible layouts, and no `ViewCell` requirement.

## Essential patterns

### Basic setup

```xml
<CollectionView ItemsSource="{Binding Items}">
    <CollectionView.ItemTemplate>
        <DataTemplate x:DataType="models:Item">
            <HorizontalStackLayout Padding="8" Spacing="8">
                <Image Source="{Binding Icon}" WidthRequest="40" HeightRequest="40" />
                <Label Text="{Binding Name}" VerticalOptions="Center" />
            </HorizontalStackLayout>
        </DataTemplate>
    </CollectionView.ItemTemplate>
</CollectionView>
```

- Bind `ItemsSource` to an `ObservableCollection<T>` so the UI updates on add/remove.
- Each item template root must be a `Layout` or `View` — **never use `ViewCell`**.
- Always set `x:DataType` on `DataTemplate` for compiled bindings.

### SwipeView — binding from inside DataTemplate

Commands inside a `DataTemplate` can't directly reach your ViewModel. Use `RelativeSource AncestorType`:

```xml
<SwipeItem Text="Delete"
           BackgroundColor="Red"
           Command="{Binding Source={RelativeSource AncestorType={x:Type viewmodels:MainViewModel}}, Path=DeleteCommand}"
           CommandParameter="{Binding}" />
```

### Pull-to-refresh

Wrap `CollectionView` in a `RefreshView`. Set `IsRefreshing` back to `false` when done:

```xml
<RefreshView IsRefreshing="{Binding IsRefreshing}"
             Command="{Binding RefreshCommand}">
    <CollectionView ItemsSource="{Binding Items}" />
</RefreshView>
```

### Incremental loading (infinite scroll)

```xml
<CollectionView ItemsSource="{Binding Items}"
                RemainingItemsThreshold="5"
                RemainingItemsThresholdReachedCommand="{Binding LoadMoreCommand}" />
```

> ⚠️ **Do NOT use with StackLayout-based ItemsLayout** — it has no virtualization and triggers infinite threshold-reached events. Always use `LinearItemsLayout` or `GridItemsLayout`.

## Performance tips

- **Use `MeasureFirstItem`** for uniform item sizes — significantly faster than the default `MeasureAllItems`:
  ```xml
  <LinearItemsLayout Orientation="Vertical" ItemSizingStrategy="MeasureFirstItem" />
  ```
- **Always use `ObservableCollection<T>`**, not `List<T>`. Swapping a `List` forces a full re-render.
- **Update collections on the UI thread** — `MainThread.BeginInvokeOnMainThread(() => Items.Add(item))`.

## Common gotchas

| Issue | Fix |
|---|---|
| UI doesn't update when items change | Use `ObservableCollection<T>`, not `List<T>`. |
| App crashes or blank items | **Never use `ViewCell`** — use `Grid`, `StackLayout`, or any `View` as template root. |
| Items disappear or layout breaks | Always update `ItemsSource` and the collection on the **UI thread** (`MainThread.BeginInvokeOnMainThread`). |
| Incremental loading fires endlessly | Don't use `StackLayout` as layout; use `LinearItemsLayout` or `GridItemsLayout`. |
| EmptyView doesn't render correctly | Wrap custom empty views in `ContentView`. |
| Poor scroll performance | Use `MeasureFirstItem` sizing strategy for uniform item sizes. |
| Selected state not visible | Add `VisualState Name="Selected"` to the item template root element. |
| Binding errors in SwipeView commands | Use `RelativeSource AncestorType` to reach the ViewModel from inside the item template. |
