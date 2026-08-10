// Monobank Acquiring — Go Example Server
//
// Мінімальний сервер з 3 ендпоінтами:
// - POST /pay         — створити invoice та повернути посилання на оплату
// - GET  /status?id=  — перевірити статус invoice
// - POST /webhook     — прийняти та верифікувати webhook
//
// Запуск:
//   export MONOBANK_TOKEN="uSe5P..."   # токен мерчанта
//   go run main.go
//
// Де взяти токен:
//   1. Тестовий — https://api.monobank.ua/ (авторизація через QR у додатку monobank)
//   2. Бойовий — https://web.monobank.ua/ (розділ "Мерчант" у особистому кабінеті)

package main

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
)

// ============================================================
// Налаштування
// ============================================================

// X-Token мерчанта — читаємо з env-змінної MONOBANK_TOKEN.
// Збережи в .env або export перед запуском:
//
//	export MONOBANK_TOKEN="uSe5P..."
var (
	token      = os.Getenv("MONOBANK_TOKEN")
	webhookURL = getEnvOrDefault("MONOBANK_WEBHOOK_URL", "https://your-domain.com/webhook")
)

const (
	monoAPI = "https://api.monobank.ua"
	port    = ":3000"
)

func getEnvOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// Кеш публічного ключа
var (
	cachedPubKey *ecdsa.PublicKey
	pubKeyMu     sync.Mutex
)

// ============================================================
// Допоміжні функції
// ============================================================

func getPubKey() (*ecdsa.PublicKey, error) {
	pubKeyMu.Lock()
	defer pubKeyMu.Unlock()

	if cachedPubKey != nil {
		return cachedPubKey, nil
	}

	req, _ := http.NewRequest("GET", monoAPI+"/api/merchant/pubkey", nil)
	req.Header.Set("X-Token", token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Key string `json:"key"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	// Декодуємо: base64 -> PEM -> ECDSA public key
	pemBytes, err := base64.StdEncoding.DecodeString(result.Key)
	if err != nil {
		return nil, err
	}
	block, _ := pem.Decode(pemBytes)
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM")
	}
	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, err
	}
	cachedPubKey = pub.(*ecdsa.PublicKey)
	return cachedPubKey, nil
}

func resetPubKey() {
	pubKeyMu.Lock()
	cachedPubKey = nil
	pubKeyMu.Unlock()
}

func verifySignature(body []byte, xSignB64 string) bool {
	pubKey, err := getPubKey()
	if err != nil {
		log.Printf("Failed to get pubkey: %v", err)
		return false
	}

	sig, err := base64.StdEncoding.DecodeString(xSignB64)
	if err != nil {
		return false
	}

	hash := sha256.Sum256(body)
	return ecdsa.VerifyASN1(pubKey, hash[:], sig)
}

func monoRequest(method, path string, body any) (map[string]any, error) {
	var reqBody io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		// [DEBUG] Лише для прикладу — у продакшен-коді цей вивід потрібно прибрати!
		log.Printf("[DEBUG] %s %s request: %s", method, path, string(b))
		reqBody = bytes.NewReader(b)
	} else {
		// [DEBUG] Лише для прикладу — у продакшен-коді цей вивід потрібно прибрати!
		log.Printf("[DEBUG] %s %s request", method, path)
	}

	req, err := http.NewRequest(method, monoAPI+path, reqBody)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Token", token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// [DEBUG] Лише для прикладу — у продакшен-коді цей вивід потрібно прибрати!
	log.Printf("[DEBUG] %s %s response (%d): %s", method, path, resp.StatusCode, string(respBytes))

	var result map[string]any
	if err := json.Unmarshal(respBytes, &result); err != nil {
		return nil, err
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("mono API error: %v", result)
	}
	return result, nil
}

func jsonResponse(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// ============================================================
// Ендпоінти
// ============================================================

func handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprint(w, `
		<h1>Monobank Acquiring Test</h1>
		<form action="/pay" method="POST">
			<label>Сума (копійки): <input name="amount" value="4200"></label><br><br>
			<label>Опис: <input name="description" value="Тестовий платіж"></label><br><br>
			<button type="submit">Оплатити</button>
		</form>
	`)
}

func handlePay(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", 405)
		return
	}

	r.ParseForm()
	amountStr := r.FormValue("amount")
	if amountStr == "" {
		jsonResponse(w, 400, map[string]string{"error": "amount is required"})
		return
	}
	var amount int
	if _, err := fmt.Sscanf(amountStr, "%d", &amount); err != nil || amount <= 0 {
		jsonResponse(w, 400, map[string]string{"error": "amount must be a positive integer"})
		return
	}

	// Формуємо тіло запиту — лише обов'язкові поля + те, що прийшло
	body := map[string]any{
		"amount":      amount,
		"redirectUrl": "http://" + r.Host + "/",
		"webHookUrl":  webhookURL,
	}

	merchantInfo := map[string]any{}
	if v := r.FormValue("description"); v != "" {
		merchantInfo["destination"] = v
	}
	if v := r.FormValue("reference"); v != "" {
		merchantInfo["reference"] = v
	}
	if len(merchantInfo) > 0 {
		body["merchantPaymInfo"] = merchantInfo
	}

	data, err := monoRequest("POST", "/api/merchant/invoice/create", body)
	if err != nil {
		jsonResponse(w, 400, map[string]string{"error": err.Error()})
		return
	}

	jsonResponse(w, 200, map[string]any{
		"invoiceId": data["invoiceId"],
		"pageUrl":   data["pageUrl"],
	})
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	invoiceID := r.URL.Query().Get("id")
	if invoiceID == "" {
		jsonResponse(w, 400, map[string]string{"error": "missing id parameter"})
		return
	}

	data, err := monoRequest("GET", "/api/merchant/invoice/status?invoiceId="+invoiceID, nil)
	if err != nil {
		jsonResponse(w, 400, map[string]string{"error": err.Error()})
		return
	}

	jsonResponse(w, 200, data)
}

func handleWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", 405)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read body", 400)
		return
	}

	xSign := r.Header.Get("X-Sign")
	if xSign == "" {
		http.Error(w, "Missing X-Sign header", 400)
		return
	}

	// Перевіряємо підпис
	if !verifySignature(body, xSign) {
		// Ключ міг оновитися — пробуємо з новим
		resetPubKey()
		if !verifySignature(body, xSign) {
			http.Error(w, "Invalid signature", 400)
			return
		}
	}

	// Підпис вірний — обробляємо дані
	var data map[string]any
	json.Unmarshal(body, &data)

	// [DEBUG] Лише для прикладу — у продакшен-коді цей вивід потрібно прибрати!
	log.Printf("[DEBUG] Webhook received: %s", string(body))

	// Тут твоя бізнес-логіка: оновити замовлення, надіслати email тощо

	w.WriteHeader(200)
	fmt.Fprint(w, "OK")
}

func main() {
	if token == "" {
		log.Fatal("MONOBANK_TOKEN is not set. Export it before running:\n  export MONOBANK_TOKEN=\"uSe5P...\"")
	}

	http.HandleFunc("/", handleIndex)
	http.HandleFunc("/pay", handlePay)
	http.HandleFunc("/status", handleStatus)
	http.HandleFunc("/webhook", handleWebhook)

	log.Printf("Server running on http://localhost%s", port)
	log.Fatal(http.ListenAndServe(port, nil))
}
