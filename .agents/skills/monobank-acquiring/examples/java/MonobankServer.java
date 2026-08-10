// Monobank Acquiring — Java Example Server
//
// Мінімальний сервер з 3 ендпоінтами:
// - POST /pay         — створити invoice та повернути посилання на оплату
// - GET  /status?id=  — перевірити статус invoice
// - POST /webhook     — прийняти та верифікувати webhook
//
// Запуск:
//   javac MonobankServer.java
//   export MONOBANK_TOKEN="uSe5P..."   # токен мерчанта
//   java MonobankServer
//
// Де взяти токен:
//   1. Тестовий — https://api.monobank.ua/ (авторизація через QR у додатку monobank)
//   2. Бойовий — https://web.monobank.ua/ (розділ "Мерчант" у особистому кабінеті)
//
// Вимоги: JDK 11+ (без зовнішніх залежностей).

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.URL;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.Signature;
import java.security.interfaces.ECPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

public class MonobankServer {

    // ============================================================
    // Налаштування
    // ============================================================

    // X-Token мерчанта — читаємо з env-змінної MONOBANK_TOKEN.
    // Збережи в .env або export перед запуском:
    //   export MONOBANK_TOKEN="uSe5P..."
    static final String TOKEN = System.getenv("MONOBANK_TOKEN") != null ? System.getenv("MONOBANK_TOKEN") : "";
    static final String WEBHOOK_URL = System.getenv("MONOBANK_WEBHOOK_URL") != null ? System.getenv("MONOBANK_WEBHOOK_URL") : "https://your-domain.com/webhook";
    static final String MONO_API = "https://api.monobank.ua";
    static final int PORT = 3000;

    // Кеш публічного ключа
    static ECPublicKey cachedPubKey = null;

    // ============================================================
    // Допоміжні функції
    // ============================================================

    static String monoRequest(String method, String path, String body) throws Exception {
        URL url = new URL(MONO_API + path);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(method);
        conn.setRequestProperty("X-Token", TOKEN);
        conn.setRequestProperty("Content-Type", "application/json");

        if (body != null) {
            conn.setDoOutput(true);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }
        }

        // [DEBUG] Лише для прикладу — у продакшен-коді цей вивід потрібно прибрати!
        System.out.println("[DEBUG] " + method + " " + path + " request: " + (body != null ? body : ""));

        int status = conn.getResponseCode();
        InputStream is = (status >= 200 && status < 300) ? conn.getInputStream() : conn.getErrorStream();
        String response = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        is.close();

        // [DEBUG] Лише для прикладу — у продакшен-коді цей вивід потрібно прибрати!
        System.out.println("[DEBUG] " + method + " " + path + " response (" + status + "): " + response);

        if (status != 200) {
            throw new RuntimeException("Mono API error (" + status + "): " + response);
        }
        return response;
    }

    static synchronized ECPublicKey getPubKey() throws Exception {
        if (cachedPubKey != null) return cachedPubKey;

        String resp = monoRequest("GET", "/api/merchant/pubkey", null);
        // Простий парсинг JSON (без зовнішніх бібліотек)
        String keyB64 = resp.split("\"key\"\\s*:\\s*\"")[1].split("\"")[0];

        // Декодуємо: base64 -> PEM -> ECDSA public key
        byte[] pemBytes = Base64.getDecoder().decode(keyB64);
        String pemStr = new String(pemBytes, StandardCharsets.UTF_8);

        // Витягуємо base64 вміст з PEM
        String base64Key = pemStr
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s", "");
        byte[] keyBytes = Base64.getDecoder().decode(base64Key);

        X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
        KeyFactory kf = KeyFactory.getInstance("EC");
        cachedPubKey = (ECPublicKey) kf.generatePublic(spec);
        return cachedPubKey;
    }

    static synchronized void resetPubKey() {
        cachedPubKey = null;
    }

    static boolean verifySignature(byte[] body, String xSignB64) {
        try {
            ECPublicKey pubKey = getPubKey();
            byte[] signatureBytes = Base64.getDecoder().decode(xSignB64);

            // SHA-256 хеш + ECDSA верифікація
            Signature sig = Signature.getInstance("SHA256withECDSA");
            sig.initVerify(pubKey);
            sig.update(body);
            return sig.verify(signatureBytes);
        } catch (Exception e) {
            System.err.println("Verify error: " + e.getMessage());
            return false;
        }
    }

    static Map<String, String> parseForm(String body) {
        Map<String, String> params = new HashMap<>();
        if (body == null || body.isEmpty()) return params;
        for (String pair : body.split("&")) {
            String[] kv = pair.split("=", 2);
            String key = URLDecoder.decode(kv[0], StandardCharsets.UTF_8);
            String value = kv.length > 1 ? URLDecoder.decode(kv[1], StandardCharsets.UTF_8) : "";
            params.put(key, value);
        }
        return params;
    }

    static String getQueryParam(String query, String name) {
        if (query == null) return null;
        for (String pair : query.split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv[0].equals(name) && kv.length > 1) {
                return URLDecoder.decode(kv[1], StandardCharsets.UTF_8);
            }
        }
        return null;
    }

    static void sendResponse(HttpExchange ex, int code, String contentType, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", contentType);
        ex.sendResponseHeaders(code, bytes.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(bytes);
        }
    }

    // ============================================================
    // Ендпоінти
    // ============================================================

    public static void main(String[] args) throws Exception {
        if (TOKEN.isEmpty()) {
            System.err.println("MONOBANK_TOKEN is not set. Export it before running:");
            System.err.println("  export MONOBANK_TOKEN=\"uSe5P...\"");
            System.exit(1);
        }

        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

        // Головна сторінка з формою
        server.createContext("/", ex -> {
            if (!"/".equals(ex.getRequestURI().getPath())) {
                sendResponse(ex, 404, "text/plain", "Not found");
                return;
            }
            String html = "<h1>Monobank Acquiring Test</h1>"
                    + "<form action=\"/pay\" method=\"POST\">"
                    + "<label>Сума (копійки): <input name=\"amount\" value=\"4200\"></label><br><br>"
                    + "<label>Опис: <input name=\"description\" value=\"Тестовий платіж\"></label><br><br>"
                    + "<button type=\"submit\">Оплатити</button>"
                    + "</form>";
            sendResponse(ex, 200, "text/html; charset=utf-8", html);
        });

        // Створити invoice
        server.createContext("/pay", ex -> {
            if (!"POST".equals(ex.getRequestMethod())) {
                sendResponse(ex, 405, "text/plain", "Method not allowed");
                return;
            }

            String formBody = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            Map<String, String> form = parseForm(formBody);

            String amountStr = form.get("amount");
            if (amountStr == null || amountStr.isEmpty()) {
                sendResponse(ex, 400, "application/json", "{\"error\":\"amount is required\"}");
                return;
            }
            int amount;
            try { amount = Integer.parseInt(amountStr); } catch (NumberFormatException e) {
                sendResponse(ex, 400, "application/json", "{\"error\":\"amount must be an integer\"}");
                return;
            }
            if (amount <= 0) {
                sendResponse(ex, 400, "application/json", "{\"error\":\"amount must be > 0\"}");
                return;
            }

            String host = ex.getRequestHeaders().getFirst("Host");

            // Формуємо тіло запиту — лише обов'язкові поля + те, що прийшло
            StringBuilder merchantInfo = new StringBuilder();
            String description = form.get("description");
            String reference = form.get("reference");
            if (description != null && !description.isEmpty()) {
                merchantInfo.append("\"destination\":\"").append(description).append("\"");
            }
            if (reference != null && !reference.isEmpty()) {
                if (merchantInfo.length() > 0) merchantInfo.append(",");
                merchantInfo.append("\"reference\":\"").append(reference).append("\"");
            }

            String merchantPart = merchantInfo.length() > 0
                    ? ",\"merchantPaymInfo\":{" + merchantInfo + "}"
                    : "";

            try {
                String reqBody = String.format(
                        "{\"amount\":%d%s,\"redirectUrl\":\"http://%s/\",\"webHookUrl\":\"%s\"}",
                        amount, merchantPart, host, WEBHOOK_URL
                );
                String resp = monoRequest("POST", "/api/merchant/invoice/create", reqBody);
                sendResponse(ex, 200, "application/json", resp);
            } catch (Exception e) {
                sendResponse(ex, 400, "application/json", "{\"error\":\"" + e.getMessage() + "\"}");
            }
        });

        // Перевірити статус
        server.createContext("/status", ex -> {
            String id = getQueryParam(ex.getRequestURI().getQuery(), "id");
            if (id == null || id.isEmpty()) {
                sendResponse(ex, 400, "application/json", "{\"error\":\"missing id parameter\"}");
                return;
            }

            try {
                String resp = monoRequest("GET", "/api/merchant/invoice/status?invoiceId=" + id, null);
                sendResponse(ex, 200, "application/json", resp);
            } catch (Exception e) {
                sendResponse(ex, 400, "application/json", "{\"error\":\"" + e.getMessage() + "\"}");
            }
        });

        // Прийняти webhook
        server.createContext("/webhook", ex -> {
            if (!"POST".equals(ex.getRequestMethod())) {
                sendResponse(ex, 405, "text/plain", "Method not allowed");
                return;
            }

            byte[] body = ex.getRequestBody().readAllBytes();
            String xSign = ex.getRequestHeaders().getFirst("X-Sign");

            if (xSign == null || xSign.isEmpty()) {
                sendResponse(ex, 400, "text/plain", "Missing X-Sign header");
                return;
            }

            // Перевіряємо підпис
            boolean valid = verifySignature(body, xSign);
            if (!valid) {
                // Ключ міг оновитися — пробуємо з новим
                resetPubKey();
                valid = verifySignature(body, xSign);
            }

            if (!valid) {
                sendResponse(ex, 400, "text/plain", "Invalid signature");
                return;
            }

            // Підпис вірний — обробляємо дані
            String bodyStr = new String(body, StandardCharsets.UTF_8);

            // [DEBUG] Лише для прикладу — у продакшен-коді цей вивід потрібно прибрати!
            System.out.println("[DEBUG] Webhook received: " + bodyStr);

            // Тут твоя бізнес-логіка: оновити замовлення, надіслати email тощо

            sendResponse(ex, 200, "text/plain", "OK");
        });

        server.setExecutor(null);
        server.start();
        System.out.println("Server running on http://localhost:" + PORT);
    }
}
