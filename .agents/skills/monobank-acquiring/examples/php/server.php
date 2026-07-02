<?php
// Monobank Acquiring — PHP Example Server
//
// Мінімальний сервер з 3 ендпоінтами:
// - POST /pay         — створити invoice та повернути посилання на оплату
// - GET  /status?id=  — перевірити статус invoice
// - POST /webhook     — прийняти та верифікувати webhook
//
// Запуск:
//   export MONOBANK_TOKEN="uSe5P..."   # токен мерчанта
//   php -S localhost:3000 server.php
//
// Де взяти токен:
//   1. Тестовий — https://api.monobank.ua/ (авторизація через QR у додатку monobank)
//   2. Бойовий — https://web.monobank.ua/ (розділ "Мерчант" у особистому кабінеті)
//
// Залежності: лише вбудовані розширення PHP (openssl, curl, json).

// ============================================================
// Налаштування
// ============================================================

// X-Token мерчанта — читаємо з env-змінної MONOBANK_TOKEN.
// Збережи в .env або export перед запуском:
//   export MONOBANK_TOKEN="uSe5P..."
define('TOKEN', getenv('MONOBANK_TOKEN') ?: '');
define('WEBHOOK_URL', getenv('MONOBANK_WEBHOOK_URL') ?: 'https://your-domain.com/webhook');
define('MONO_API', 'https://api.monobank.ua');

// Кеш публічного ключа (в пам'яті, скидається при перезапуску)
$GLOBALS['cached_pubkey_pem'] = null;

// ============================================================
// Допоміжні функції
// ============================================================

function mono_request(string $method, string $path, ?array $body = null): array {
    $ch = curl_init(MONO_API . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'X-Token: ' . TOKEN,
            'Content-Type: application/json',
        ],
    ]);

    if ($method === 'POST' && $body !== null) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    // [DEBUG] Лише для прикладу — у продакшен-коді цей вивід потрібно прибрати!
    error_log("[DEBUG] $method $path request: " . ($body !== null ? json_encode($body, JSON_UNESCAPED_UNICODE) : ''));

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // [DEBUG] Лише для прикладу — у продакшен-коді цей вивід потрібно прибрати!
    error_log("[DEBUG] $method $path response ($httpCode): $response");

    $data = json_decode($response, true) ?? [];
    if ($httpCode !== 200) {
        throw new RuntimeException("Mono API error ($httpCode): $response");
    }
    return $data;
}

function get_pubkey_pem(): string {
    if ($GLOBALS['cached_pubkey_pem'] === null) {
        $data = mono_request('GET', '/api/merchant/pubkey');
        // Декодуємо base64 -> PEM рядок
        $GLOBALS['cached_pubkey_pem'] = base64_decode($data['key']);
    }
    return $GLOBALS['cached_pubkey_pem'];
}

function reset_pubkey(): void {
    $GLOBALS['cached_pubkey_pem'] = null;
}

function verify_signature(string $body, string $x_sign_b64): bool {
    $pem = get_pubkey_pem();
    $pubkey = openssl_pkey_get_public($pem);
    if ($pubkey === false) {
        return false;
    }

    $signature = base64_decode($x_sign_b64);

    // openssl_verify з SHA-256 та ECDSA
    $result = openssl_verify($body, $signature, $pubkey, OPENSSL_ALGO_SHA256);
    return $result === 1;
}

function json_response(int $status, $data): void {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
}

// ============================================================
// Роутинг
// ============================================================

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (TOKEN === '') {
    http_response_code(500);
    echo "MONOBANK_TOKEN is not set. Export it before running:\n  export MONOBANK_TOKEN=\"uSe5P...\"\n";
    exit;
}

// Головна сторінка
if ($path === '/' && $method === 'GET') {
    header('Content-Type: text/html; charset=utf-8');
    echo <<<HTML
    <h1>Monobank Acquiring Test</h1>
    <form action="/pay" method="POST">
        <label>Сума (копійки): <input name="amount" value="4200"></label><br><br>
        <label>Опис: <input name="description" value="Тестовий платіж"></label><br><br>
        <button type="submit">Оплатити</button>
    </form>
HTML;
    exit;
}

// Створити invoice
if ($path === '/pay' && $method === 'POST') {
    if (!isset($_POST['amount']) || $_POST['amount'] === '') {
        json_response(400, ['error' => 'amount is required']);
        exit;
    }
    $amount = (int)$_POST['amount'];
    if ($amount <= 0) {
        json_response(400, ['error' => 'amount must be > 0']);
        exit;
    }

    // Формуємо тіло запиту — лише обов'язкові поля + те, що прийшло
    $body = [
        'amount' => $amount,
        'redirectUrl' => 'http://' . $_SERVER['HTTP_HOST'] . '/',
        'webHookUrl' => WEBHOOK_URL,
    ];

    $merchantInfo = [];
    if (!empty($_POST['description'])) $merchantInfo['destination'] = $_POST['description'];
    if (!empty($_POST['reference'])) $merchantInfo['reference'] = $_POST['reference'];
    if (!empty($merchantInfo)) $body['merchantPaymInfo'] = $merchantInfo;

    try {
        $data = mono_request('POST', '/api/merchant/invoice/create', $body);

        json_response(200, [
            'invoiceId' => $data['invoiceId'],
            'pageUrl' => $data['pageUrl'],
        ]);
    } catch (RuntimeException $e) {
        json_response(400, ['error' => $e->getMessage()]);
    }
    exit;
}

// Перевірити статус invoice
if ($path === '/status' && $method === 'GET') {
    $invoiceId = $_GET['id'] ?? '';
    if ($invoiceId === '') {
        json_response(400, ['error' => 'missing id parameter']);
        exit;
    }

    try {
        $data = mono_request('GET', '/api/merchant/invoice/status?invoiceId=' . urlencode($invoiceId));
        json_response(200, $data);
    } catch (RuntimeException $e) {
        json_response(400, ['error' => $e->getMessage()]);
    }
    exit;
}

// Прийняти webhook
if ($path === '/webhook' && $method === 'POST') {
    $body = file_get_contents('php://input');
    $xSign = $_SERVER['HTTP_X_SIGN'] ?? '';

    if ($xSign === '') {
        http_response_code(400);
        echo 'Missing X-Sign header';
        exit;
    }

    // Перевіряємо підпис
    $valid = verify_signature($body, $xSign);
    if (!$valid) {
        // Ключ міг оновитися — пробуємо з новим
        reset_pubkey();
        $valid = verify_signature($body, $xSign);
    }

    if (!$valid) {
        http_response_code(400);
        echo 'Invalid signature';
        exit;
    }

    // Підпис вірний — обробляємо дані
    $data = json_decode($body, true);

    // [DEBUG] Лише для прикладу — у продакшен-коді цей вивід потрібно прибрати!
    error_log("[DEBUG] Webhook received: " . json_encode($data, JSON_UNESCAPED_UNICODE));

    // Тут твоя бізнес-логіка: оновити замовлення, надіслати email тощо

    echo 'OK';
    exit;
}

// 404
http_response_code(404);
echo 'Not found';
