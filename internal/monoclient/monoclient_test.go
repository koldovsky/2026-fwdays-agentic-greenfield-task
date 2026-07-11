package monoclient

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

const fakeToken = "test-token-do-not-leak"

// fetcherAt returns an httpJarFetcher whose requests target the given test
// server URL instead of the hardcoded monobank host, by wrapping the
// http.Client's Transport to redirect requests.
func fetcherAt(t *testing.T, serverURL string) *httpJarFetcher {
	t.Helper()
	return &httpJarFetcher{httpClient: &http.Client{Transport: redirectTransport{targetBase: serverURL}}}
}

type redirectTransport struct {
	targetBase string
}

func (rt redirectTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	target, err := http.NewRequestWithContext(req.Context(), req.Method, rt.targetBase+req.URL.Path, req.Body)
	if err != nil {
		return nil, err
	}
	target.Header = req.Header
	return http.DefaultTransport.RoundTrip(target)
}

func setEnv(t *testing.T, key, value string) {
	t.Helper()
	t.Setenv(key, value)
}

func TestHTTPJarFetcher_Success(t *testing.T) {
	var requests atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		if got := r.Header.Get("X-Token"); got != fakeToken {
			t.Errorf("X-Token header = %q, want %q", got, fakeToken)
		}
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"accounts": []map[string]any{{"id": "ignored"}},
			"jars": []map[string]any{
				{"title": "Заощадження", "sendId": "abc123", "currencyCode": 980, "balance": 10000, "goal": 50000},
				{"title": "USD jar", "sendId": "def456", "currencyCode": 840},
			},
		})
	}))
	defer server.Close()

	setEnv(t, tokenEnvVar, fakeToken)
	fetcher := fetcherAt(t, server.URL)

	jars, err := fetcher.FetchJars(context.Background())
	if err != nil {
		t.Fatalf("FetchJars() error = %v", err)
	}
	want := []Jar{
		{Title: "Заощадження", SendID: "abc123", CurrencyCode: 980},
		{Title: "USD jar", SendID: "def456", CurrencyCode: 840},
	}
	if len(jars) != len(want) {
		t.Fatalf("got %d jars, want %d: %+v", len(jars), len(want), jars)
	}
	for i := range want {
		if jars[i] != want[i] {
			t.Errorf("jar %d = %+v, want %+v", i, jars[i], want[i])
		}
	}
	if requests.Load() != 1 {
		t.Errorf("server received %d requests, want exactly 1", requests.Load())
	}
}

func TestHTTPJarFetcher_StatusErrors(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		wantErr    error
	}{
		{"401 maps to invalid token", http.StatusUnauthorized, ErrInvalidToken},
		{"429 maps to rate limited", http.StatusTooManyRequests, ErrRateLimited},
		{"500 maps to unreachable", http.StatusInternalServerError, ErrUnreachable},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tc.statusCode)
			}))
			defer server.Close()

			setEnv(t, tokenEnvVar, fakeToken)
			fetcher := fetcherAt(t, server.URL)

			_, err := fetcher.FetchJars(context.Background())
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("FetchJars() error = %v, want errors.Is(_, %v)", err, tc.wantErr)
			}
			if strings.Contains(err.Error(), fakeToken) {
				t.Errorf("error message leaks token: %v", err)
			}
		})
	}
}

func TestHTTPJarFetcher_Unreachable(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	setEnv(t, tokenEnvVar, fakeToken)
	fetcher := fetcherAt(t, server.URL)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()

	_, err := fetcher.FetchJars(ctx)
	if !errors.Is(err, ErrUnreachable) {
		t.Fatalf("FetchJars() error = %v, want errors.Is(_, ErrUnreachable)", err)
	}
	if strings.Contains(err.Error(), fakeToken) {
		t.Errorf("error message leaks token: %v", err)
	}
}

func TestHTTPJarFetcher_MissingToken(t *testing.T) {
	requested := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requested = true
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	setEnv(t, tokenEnvVar, "")
	fetcher := fetcherAt(t, server.URL)

	_, err := fetcher.FetchJars(context.Background())
	if !errors.Is(err, ErrMissingToken) {
		t.Fatalf("FetchJars() error = %v, want errors.Is(_, ErrMissingToken)", err)
	}
	if requested {
		t.Error("FetchJars() made a network request despite a missing token")
	}
}

func TestHTTPJarFetcher_LiveURL(t *testing.T) {
	if clientInfoURL != "https://api.monobank.ua/personal/client-info" {
		t.Fatalf("clientInfoURL = %q, want the official HTTPS monobank host", clientInfoURL)
	}
}

func writeFixture(t *testing.T, content string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "client-info.json")
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
	return path
}

func TestFixtureJarFetcher_Success(t *testing.T) {
	path := writeFixture(t, `{"jars":[{"title":"Подушка","sendId":"xyz789","currencyCode":980}]}`)
	fetcher := &fixtureJarFetcher{path: path}

	jars, err := fetcher.FetchJars(context.Background())
	if err != nil {
		t.Fatalf("FetchJars() error = %v", err)
	}
	want := []Jar{{Title: "Подушка", SendID: "xyz789", CurrencyCode: 980}}
	if len(jars) != 1 || jars[0] != want[0] {
		t.Fatalf("got %+v, want %+v", jars, want)
	}
}

func TestFixtureJarFetcher_MissingFile(t *testing.T) {
	fetcher := &fixtureJarFetcher{path: filepath.Join(t.TempDir(), "does-not-exist.json")}

	_, err := fetcher.FetchJars(context.Background())
	if err == nil {
		t.Fatal("FetchJars() error = nil, want a fatal error for a missing fixture file")
	}
}

func TestFixtureJarFetcher_MalformedJSON(t *testing.T) {
	path := writeFixture(t, `{not valid json`)
	fetcher := &fixtureJarFetcher{path: path}

	_, err := fetcher.FetchJars(context.Background())
	if err == nil {
		t.Fatal("FetchJars() error = nil, want a fatal error for malformed fixture JSON")
	}
}

func TestNewJarFetcher_SelectsFixtureOverLiveClient(t *testing.T) {
	path := writeFixture(t, `{"jars":[{"title":"Подорожі","sendId":"jjj111","currencyCode":980}]}`)
	setEnv(t, fixtureEnvVar, path)
	setEnv(t, tokenEnvVar, "")

	fetcher := NewJarFetcher()
	if _, ok := fetcher.(*fixtureJarFetcher); !ok {
		t.Fatalf("NewJarFetcher() = %T, want *fixtureJarFetcher", fetcher)
	}

	jars, err := fetcher.FetchJars(context.Background())
	if err != nil {
		t.Fatalf("FetchJars() error = %v, want success even without MONO_TOKEN", err)
	}
	if len(jars) != 1 || jars[0].Title != "Подорожі" {
		t.Fatalf("got %+v, want the fixture jar", jars)
	}
}

func TestNewJarFetcher_LiveWhenNoFixture(t *testing.T) {
	setEnv(t, fixtureEnvVar, "")

	fetcher := NewJarFetcher()
	if _, ok := fetcher.(*httpJarFetcher); !ok {
		t.Fatalf("NewJarFetcher() = %T, want *httpJarFetcher", fetcher)
	}
}
