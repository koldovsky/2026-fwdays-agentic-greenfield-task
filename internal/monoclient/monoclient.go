// Package monoclient fetches the caller's monobank jars, either live via
// the personal client-info endpoint or from a local fixture file for
// offline testing.
package monoclient

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
)

const (
	tokenEnvVar   = "MONO_TOKEN"
	fixtureEnvVar = "MONO_CLIENT_INFO_FILE"
	clientInfoURL = "https://api.monobank.ua/personal/client-info"
)

// Sentinel errors distinguishing the fatal client-info failure conditions.
// None of them are retried automatically; callers match on these with
// errors.Is to print a distinct message per condition.
var (
	ErrMissingToken = errors.New("MONO_TOKEN is not set")
	ErrInvalidToken = errors.New("monobank rejected the token (401)")
	ErrRateLimited  = errors.New("monobank rate-limited the request (429)")
	ErrUnreachable  = errors.New("monobank client-info is unreachable")
)

// Jar is a single monobank jar, reduced to the fields jarsplit consumes.
type Jar struct {
	Title        string
	SendID       string
	CurrencyCode int
}

// JarFetcher fetches the caller's jars. FetchJars is expected to make at
// most one network call; ctx carries the caller's timeout, since the
// implementations here do not set a client-level timeout of their own.
type JarFetcher interface {
	FetchJars(ctx context.Context) ([]Jar, error)
}

// NewJarFetcher returns a fixture-backed JarFetcher when MONO_CLIENT_INFO_FILE
// is set, otherwise a live HTTP-backed one. The fixture path is selected
// before any MONO_TOKEN check, so fixture-driven runs never require a token.
func NewJarFetcher() JarFetcher {
	if path := os.Getenv(fixtureEnvVar); path != "" {
		return &fixtureJarFetcher{path: path}
	}
	return &httpJarFetcher{httpClient: &http.Client{}}
}

type httpJarFetcher struct {
	httpClient *http.Client
}

func (f *httpJarFetcher) FetchJars(ctx context.Context) ([]Jar, error) {
	token := os.Getenv(tokenEnvVar)
	if token == "" {
		return nil, ErrMissingToken
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, clientInfoURL, nil)
	if err != nil {
		return nil, fmt.Errorf("build client-info request: %w", err)
	}
	req.Header.Set("X-Token", token)

	resp, err := f.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("client-info request failed: %w: %w", ErrUnreachable, err)
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
		return decodeJars(resp.Body)
	case http.StatusUnauthorized:
		return nil, fmt.Errorf("client-info returned 401: %w", ErrInvalidToken)
	case http.StatusTooManyRequests:
		return nil, fmt.Errorf("client-info returned 429: %w", ErrRateLimited)
	default:
		// No sentinel fits an unexpected status; bucket it with the other
		// non-retryable "couldn't get a usable response" condition.
		return nil, fmt.Errorf("client-info returned unexpected status %d: %w", resp.StatusCode, ErrUnreachable)
	}
}

type fixtureJarFetcher struct {
	path string
}

func (f *fixtureJarFetcher) FetchJars(_ context.Context) ([]Jar, error) {
	file, err := os.Open(f.path)
	if err != nil {
		return nil, fmt.Errorf("read fixture client-info file: %w", err)
	}
	defer file.Close()

	jars, err := decodeJars(file)
	if err != nil {
		return nil, fmt.Errorf("parse fixture client-info file: %w", err)
	}
	return jars, nil
}

// clientInfoResponse mirrors the subset of monobank's client-info schema
// jarsplit consumes. accounts[], balance, and goal are intentionally not
// decoded — nothing downstream reads them.
type clientInfoResponse struct {
	Jars []jarDTO `json:"jars"`
}

type jarDTO struct {
	Title        string `json:"title"`
	SendID       string `json:"sendId"`
	CurrencyCode int    `json:"currencyCode"`
}

func decodeJars(r io.Reader) ([]Jar, error) {
	var body clientInfoResponse
	if err := json.NewDecoder(r).Decode(&body); err != nil {
		return nil, fmt.Errorf("decode client-info response: %w", err)
	}

	jars := make([]Jar, len(body.Jars))
	for i, j := range body.Jars {
		jars[i] = Jar{Title: j.Title, SendID: j.SendID, CurrencyCode: j.CurrencyCode}
	}
	return jars, nil
}
