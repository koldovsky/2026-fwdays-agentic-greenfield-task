# Monobank Acquiring — Python Example Server
#
# Мінімальний сервер з 3 ендпоінтами:
# - POST /pay         — створити invoice та повернути посилання на оплату
# - GET  /status/<id> — перевірити статус invoice
# - POST /webhook     — прийняти та верифікувати webhook
#
# Запуск:
#   pip install flask requests ecdsa
#   export MONOBANK_TOKEN="uSe5P..."   # токен мерчанта
#   python server.py
#
# Де взяти токен:
#   1. Тестовий — https://api.monobank.ua/ (авторизація через QR у додатку monobank)
#   2. Бойовий — https://web.monobank.ua/ (розділ "Мерчант" у особистому кабінеті)

import hashlib
import json
import os
from base64 import b64decode

import requests
from ecdsa import VerifyingKey, BadSignatureError
from ecdsa.util import sigdecode_der
from flask import Flask, request, jsonify

# ============================================================
# Налаштування
# ============================================================
# X-Token мерчанта — читаємо з env-змінної MONOBANK_TOKEN.
# Збережи в .env або export перед запуском:
#   export MONOBANK_TOKEN="uSe5P..."
TOKEN = os.environ.get("MONOBANK_TOKEN", "")
WEBHOOK_URL = os.environ.get("MONOBANK_WEBHOOK_URL", "https://your-domain.com/webhook")
MONO_API = "https://api.monobank.ua"

app = Flask(__name__)

# Кеш публічного ключа для верифікації webhook'ів
_cached_pubkey = None


def get_pubkey():
    """Отримати публічний ключ monobank (з кешуванням)."""
    global _cached_pubkey
    if _cached_pubkey is None:
        resp = requests.get(
            f"{MONO_API}/api/merchant/pubkey",
            headers={"X-Token": TOKEN},
        )
        resp.raise_for_status()
        _cached_pubkey = resp.json()["key"]
    return _cached_pubkey


def reset_pubkey():
    """Скинути кеш ключа (якщо ключ оновився)."""
    global _cached_pubkey
    _cached_pubkey = None


def verify_signature(body_bytes, x_sign_b64):
    """Перевірити ECDSA підпис webhook'а."""
    pubkey_b64 = get_pubkey()

    # Декодуємо публічний ключ: base64 -> PEM -> ECDSA key
    pem_bytes = b64decode(pubkey_b64)
    vk = VerifyingKey.from_pem(pem_bytes)

    # Декодуємо підпис з base64
    signature = b64decode(x_sign_b64)

    # Рахуємо SHA-256 хеш тіла запиту
    body_hash = hashlib.sha256(body_bytes).digest()

    try:
        vk.verify_digest(signature, body_hash, sigdecode=sigdecode_der)
        return True
    except BadSignatureError:
        return False


# ============================================================
# Ендпоінти
# ============================================================

@app.route("/")
def index():
    """Головна сторінка з формою для тестування."""
    return """
    <h1>Monobank Acquiring Test</h1>
    <form action="/pay" method="POST">
        <label>Сума (копійки): <input name="amount" value="4200"></label><br><br>
        <label>Опис: <input name="description" value="Тестовий платіж"></label><br><br>
        <button type="submit">Оплатити</button>
    </form>
    """


@app.route("/pay", methods=["POST"])
def pay():
    """Створити invoice та перенаправити на сторінку оплати."""
    raw_amount = request.form.get("amount", "")
    try:
        amount = int(raw_amount)
    except (ValueError, TypeError):
        return jsonify({"error": "amount is required and must be an integer"}), 400
    if amount <= 0:
        return jsonify({"error": "amount must be > 0"}), 400

    # Формуємо тіло запиту — лише обов'язкові поля + те, що прийшло
    body = {
        "amount": amount,
        "redirectUrl": request.host_url.rstrip("/") + "/",
        "webHookUrl": WEBHOOK_URL,
    }

    merchant_info = {}
    if request.form.get("description"):
        merchant_info["destination"] = request.form["description"]
    if request.form.get("reference"):
        merchant_info["reference"] = request.form["reference"]
    if merchant_info:
        body["merchantPaymInfo"] = merchant_info

    # [DEBUG] Лише для прикладу — у продакшен-коді цей вивід потрібно прибрати!
    print(f"[DEBUG] POST /api/merchant/invoice/create request: {json.dumps(body, ensure_ascii=False)}")

    # Створюємо invoice через API monobank
    resp = requests.post(
        f"{MONO_API}/api/merchant/invoice/create",
        headers={
            "X-Token": TOKEN,
            "Content-Type": "application/json",
        },
        json=body,
    )

    # [DEBUG] Лише для прикладу — у продакшен-коді цей вивід потрібно прибрати!
    print(f"[DEBUG] POST /api/merchant/invoice/create response ({resp.status_code}): {resp.text}")

    if resp.status_code != 200:
        return jsonify({"error": resp.text}), 400

    data = resp.json()
    return jsonify({
        "invoiceId": data["invoiceId"],
        "pageUrl": data["pageUrl"],
    })


@app.route("/status/<invoice_id>")
def status(invoice_id):
    """Перевірити статус invoice."""
    resp = requests.get(
        f"{MONO_API}/api/merchant/invoice/status",
        headers={"X-Token": TOKEN},
        params={"invoiceId": invoice_id},
    )

    # [DEBUG] Лише для прикладу — у продакшен-коді цей вивід потрібно прибрати!
    print(f"[DEBUG] GET /api/merchant/invoice/status?invoiceId={invoice_id} response ({resp.status_code}): {resp.text}")

    if resp.status_code != 200:
        return jsonify({"error": resp.text}), 400

    return jsonify(resp.json())


@app.route("/webhook", methods=["POST"])
def webhook():
    """Прийняти webhook від monobank та верифікувати підпис."""
    body_bytes = request.get_data()
    x_sign = request.headers.get("X-Sign", "")

    if not x_sign:
        return "Missing X-Sign header", 400

    # Перевіряємо підпис
    if not verify_signature(body_bytes, x_sign):
        # Ключ міг оновитися — пробуємо з новим
        reset_pubkey()
        if not verify_signature(body_bytes, x_sign):
            return "Invalid signature", 400

    # Підпис вірний — обробляємо дані
    data = json.loads(body_bytes)

    # [DEBUG] Лише для прикладу — у продакшен-коді цей вивід потрібно прибрати!
    print(f"[DEBUG] Webhook received: {json.dumps(data, ensure_ascii=False)}")

    # Тут твоя бізнес-логіка: оновити замовлення, надіслати email тощо

    return "OK", 200


if __name__ == "__main__":
    if not TOKEN:
        print("MONOBANK_TOKEN is not set. Export it before running:")
        print('  export MONOBANK_TOKEN="uSe5P..."')
        exit(1)
    print("Server running on http://localhost:3000")
    app.run(port=3000, debug=True)
