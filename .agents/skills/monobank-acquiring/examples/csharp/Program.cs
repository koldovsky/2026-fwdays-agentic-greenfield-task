// Monobank Acquiring — C# Example Server (ASP.NET Minimal API)
//
// Мінімальний сервер з 3 ендпоінтами:
// - POST /pay         — створити invoice та повернути посилання на оплату
// - GET  /status/{id} — перевірити статус invoice
// - POST /webhook     — прийняти та верифікувати webhook
//
// Запуск:
//   dotnet new web -n MonobankAcquiring
//   скопіюй цей файл як Program.cs
//   export MONOBANK_TOKEN="uSe5P..."   # токен мерчанта
//   dotnet run
//
// Де взяти токен:
//   1. Тестовий — https://api.monobank.ua/ (авторизація через QR у додатку monobank)
//   2. Бойовий — https://web.monobank.ua/ (розділ "Мерчант" у особистому кабінеті)
//
// Вимоги: .NET 7+

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

// ============================================================
// Налаштування
// ============================================================

// X-Token мерчанта — читаємо з env-змінної MONOBANK_TOKEN.
// Збережи в .env або export перед запуском:
//   export MONOBANK_TOKEN="uSe5P..."
var Token = Environment.GetEnvironmentVariable("MONOBANK_TOKEN") ?? "";
var WebhookUrl = Environment.GetEnvironmentVariable("MONOBANK_WEBHOOK_URL") ?? "https://your-domain.com/webhook";
const string MonoApi = "https://api.monobank.ua";

if (string.IsNullOrEmpty(Token))
{
    Console.Error.WriteLine("MONOBANK_TOKEN is not set. Export it before running:");
    Console.Error.WriteLine("  export MONOBANK_TOKEN=\"uSe5P...\"");
    return;
}

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var httpClient = new HttpClient();
httpClient.DefaultRequestHeaders.Add("X-Token", Token);

// Кеш публічного ключа
string? cachedPubKeyBase64 = null;

// ============================================================
// Допоміжні функції
// ============================================================

async Task<string> GetPubKey()
{
    if (cachedPubKeyBase64 == null)
    {
        var resp = await httpClient.GetFromJsonAsync<JsonElement>($"{MonoApi}/api/merchant/pubkey");
        cachedPubKeyBase64 = resp.GetProperty("key").GetString()!;
    }
    return cachedPubKeyBase64;
}

void ResetPubKey() => cachedPubKeyBase64 = null;

async Task<bool> VerifySignature(byte[] body, string xSignB64)
{
    var pubKeyB64 = await GetPubKey();

    // Декодуємо base64 -> PEM -> ECDSA public key
    var pemBytes = Convert.FromBase64String(pubKeyB64);
    var pemStr = Encoding.UTF8.GetString(pemBytes);

    var ecdsa = ECDsa.Create();
    ecdsa.ImportFromPem(pemStr);

    // Декодуємо підпис з base64
    var signature = Convert.FromBase64String(xSignB64);

    // Рахуємо SHA-256 хеш та перевіряємо підпис
    var hash = SHA256.HashData(body);
    return ecdsa.VerifyHash(hash, signature);
}

async Task<JsonElement> MonoRequest(HttpMethod method, string path, object? body = null)
{
    var request = new HttpRequestMessage(method, $"{MonoApi}{path}");
    string? requestBody = null;
    if (body != null)
    {
        requestBody = JsonSerializer.Serialize(body);
        request.Content = new StringContent(requestBody, Encoding.UTF8, "application/json");
    }

    // [DEBUG] Лише для прикладу — у продакшен-коді цей вивід потрібно прибрати!
    Console.WriteLine($"[DEBUG] {method} {path} request: {requestBody ?? ""}");

    var resp = await httpClient.SendAsync(request);
    var json = await resp.Content.ReadAsStringAsync();

    // [DEBUG] Лише для прикладу — у продакшен-коді цей вивід потрібно прибрати!
    Console.WriteLine($"[DEBUG] {method} {path} response ({(int)resp.StatusCode}): {json}");

    if (!resp.IsSuccessStatusCode)
        throw new Exception($"Mono API error ({resp.StatusCode}): {json}");

    return JsonSerializer.Deserialize<JsonElement>(json);
}

// ============================================================
// Ендпоінти
// ============================================================

// Головна сторінка з формою для тесту
app.MapGet("/", () => Results.Content("""
    <h1>Monobank Acquiring Test</h1>
    <form action="/pay" method="POST">
        <label>Сума (копійки): <input name="amount" value="4200"></label><br><br>
        <label>Опис: <input name="description" value="Тестовий платіж"></label><br><br>
        <button type="submit">Оплатити</button>
    </form>
""", "text/html"));

// Створити invoice
app.MapPost("/pay", async (HttpRequest req) =>
{
    var form = await req.ReadFormAsync();
    if (!int.TryParse(form["amount"], out var amount) || amount <= 0)
    {
        return Results.BadRequest(new { error = "amount is required and must be > 0" });
    }

    try
    {
        // Формуємо тіло запиту — лише обов'язкові поля + те, що прийшло
        var body = new Dictionary<string, object>
        {
            ["amount"] = amount,
            ["redirectUrl"] = $"{req.Scheme}://{req.Host}/",
            ["webHookUrl"] = WebhookUrl,
        };

        var merchantInfo = new Dictionary<string, string>();
        var description = form["description"].FirstOrDefault();
        var reference = form["reference"].FirstOrDefault();
        if (!string.IsNullOrEmpty(description)) merchantInfo["destination"] = description;
        if (!string.IsNullOrEmpty(reference)) merchantInfo["reference"] = reference;
        if (merchantInfo.Count > 0) body["merchantPaymInfo"] = merchantInfo;

        var data = await MonoRequest(HttpMethod.Post, "/api/merchant/invoice/create", body);

        return Results.Json(new
        {
            invoiceId = data.GetProperty("invoiceId").GetString(),
            pageUrl = data.GetProperty("pageUrl").GetString(),
        });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

// Перевірити статус invoice
app.MapGet("/status/{invoiceId}", async (string invoiceId) =>
{
    try
    {
        var data = await MonoRequest(HttpMethod.Get, $"/api/merchant/invoice/status?invoiceId={invoiceId}");
        return Results.Json(data);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

// Прийняти webhook
app.MapPost("/webhook", async (HttpContext ctx) =>
{
    using var reader = new StreamReader(ctx.Request.Body);
    var bodyStr = await reader.ReadToEndAsync();
    var bodyBytes = Encoding.UTF8.GetBytes(bodyStr);

    var xSign = ctx.Request.Headers["X-Sign"].FirstOrDefault();
    if (string.IsNullOrEmpty(xSign))
    {
        ctx.Response.StatusCode = 400;
        await ctx.Response.WriteAsync("Missing X-Sign header");
        return;
    }

    // Перевіряємо підпис
    var valid = await VerifySignature(bodyBytes, xSign);
    if (!valid)
    {
        // Ключ міг оновитися — пробуємо з новим
        ResetPubKey();
        valid = await VerifySignature(bodyBytes, xSign);
    }

    if (!valid)
    {
        ctx.Response.StatusCode = 400;
        await ctx.Response.WriteAsync("Invalid signature");
        return;
    }

    // Підпис вірний — обробляємо дані
    var data = JsonSerializer.Deserialize<JsonElement>(bodyStr);

    // [DEBUG] Лише для прикладу — у продакшен-коді цей вивід потрібно прибрати!
    Console.WriteLine($"[DEBUG] Webhook received: {bodyStr}");

    // Тут твоя бізнес-логіка: оновити замовлення, надіслати email тощо

    await ctx.Response.WriteAsync("OK");
});

app.Run("http://localhost:3000");
