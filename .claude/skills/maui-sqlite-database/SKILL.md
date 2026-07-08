---
name: maui-sqlite-database
description: >
  Add SQLite local database storage to .NET MAUI apps using sqlite-net-pcl.
  Covers data models with ORM attributes, async database service with lazy init,
  DI registration, WAL mode, and file management. Works with any UI pattern
  (XAML/MVVM, C# Markup, MauiReactor).
  USE FOR: "SQLite database", "local database", "sqlite-net-pcl", "offline storage",
  "CRUD database", "database service", "WAL mode", "CreateTableAsync",
  "local data persistence", "ORM attributes".
  DO NOT USE FOR: REST API data fetching (use maui-rest-api), secure credential storage
  (use maui-secure-storage), or file picking (use maui-file-handling).
---

# SQLite Database — Gotchas & Best Practices

For full service implementation, constants, data model templates, and common patterns, see `references/sqlite-database-api.md`.

## ⚠️ Wrong Package Trap

```xml
<!-- ❌ WRONG — these are different libraries with incompatible APIs -->
<PackageReference Include="Microsoft.Data.Sqlite" />
<PackageReference Include="sqlite-net" />
<PackageReference Include="SQLitePCL.raw" />

<!-- ✅ CORRECT — sqlite-net-pcl by praeclarum + its bundle -->
<PackageReference Include="sqlite-net-pcl" Version="1.9.*" />
<PackageReference Include="SQLitePCLRaw.bundle_green" Version="2.1.*" />
```

## Common Mistakes

### ❌ Using `Environment.GetFolderPath` for Database Path

```csharp
// ❌ Not cross-platform safe — fails on some MAUI targets
var path = Path.Combine(Environment.GetFolderPath(
    Environment.SpecialFolder.LocalApplicationData), "app.db3");

// ✅ Use FileSystem.AppDataDirectory for all MAUI platforms
var path = Path.Combine(FileSystem.AppDataDirectory, "app.db3");
```

### ❌ Multiple SQLiteAsyncConnection Instances

`SQLiteAsyncConnection` is **not thread-safe** for multiple instances pointing at the same file. Use a single instance via DI singleton:

```csharp
// ❌ Creating new connections per request
public async Task<List<Item>> GetItems()
{
    var db = new SQLiteAsyncConnection(Constants.DatabasePath);
    return await db.Table<Item>().ToListAsync();
}

// ✅ Lazy singleton — one connection, created once
private SQLiteAsyncConnection? _database;
private async Task<SQLiteAsyncConnection> GetDatabaseAsync()
{
    if (_database is not null) return _database;
    _database = new SQLiteAsyncConnection(Constants.DatabasePath, Constants.Flags);
    await _database.ExecuteAsync("PRAGMA journal_mode=WAL;");
    await _database.CreateTableAsync<TodoItem>();
    return _database;
}
```

### ❌ Forgetting WAL Mode

Without WAL, readers block writers. Always enable it at initialization:

```csharp
await _database.ExecuteAsync("PRAGMA journal_mode=WAL;");
```

### ❌ File Operations on Open Database

```csharp
// ❌ Moving/deleting while connection is open — data corruption
File.Delete(Constants.DatabasePath);

// ✅ Always close first
await databaseService.CloseConnectionAsync();
if (File.Exists(Constants.DatabasePath))
    File.Delete(Constants.DatabasePath);
```

## Platform Pitfalls

| Platform | Pitfall |
|----------|---------|
| iOS | `FileSystem.AppDataDirectory` is iCloud-backed — use `FileSystem.CacheDirectory` to exclude DB from iCloud backup |
| All | Multiple `SQLiteAsyncConnection` instances to same file → data corruption |
| All | No WAL → readers block writers, poor concurrent performance |
| All | File operations on open DB → corruption |

## Decision Framework

| Question | Recommendation |
|----------|---------------|
| DI lifetime? | **Singleton** — one connection, WAL handles concurrent reads |
| WAL mode? | **Always enable** — no reason not to on mobile |
| Database path? | `FileSystem.AppDataDirectory` — never `Environment.GetFolderPath` |
| Save pattern? | Check `Id != 0` → Update, else Insert |
| Multiple tables? | Add all `CreateTableAsync<T>()` calls in lazy init |
| Need to export/backup? | Close connection first, then `File.Copy` |

## Performance Tips

1. **Use transactions for batch writes** — individual inserts are slow; wrap in `RunInTransactionAsync`
2. **Add `[Indexed]` to frequently queried columns** — especially foreign keys
3. **WAL mode** eliminates reader/writer contention
4. **Avoid `ToListAsync()` on large tables** — use `Where()` filtering and pagination
5. **Use raw SQL for complex queries** — `QueryAsync<T>` is faster than chained LINQ for joins

## Checklist

- [ ] Install `sqlite-net-pcl` + `SQLitePCLRaw.bundle_green` (not `Microsoft.Data.Sqlite`)
- [ ] Database path uses `FileSystem.AppDataDirectory`
- [ ] Models have `[PrimaryKey, AutoIncrement]`
- [ ] Single `DatabaseService` with lazy async init pattern
- [ ] WAL enabled via `PRAGMA journal_mode=WAL`
- [ ] `DatabaseService` registered as **singleton** in DI
- [ ] Connection closed before any file move/copy/delete
- [ ] iOS: DB excluded from iCloud backup if needed
