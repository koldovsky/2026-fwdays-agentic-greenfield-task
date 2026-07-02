package main

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"md/agentic/monojar/internal/monoclient"
)

const fakeToken = "test-token-do-not-leak"

// fakeFetcher is a monoclient.JarFetcher test double returning a canned
// jar list or a canned error, so tests can drive run's error-handling and
// exit-code paths without a live network call.
type fakeFetcher struct {
	jars  []monoclient.Jar
	err   error
	calls int
}

func (f *fakeFetcher) FetchJars(_ context.Context) ([]monoclient.Jar, error) {
	f.calls++
	if f.err != nil {
		return nil, f.err
	}
	return f.jars, nil
}

func writeTempFile(t *testing.T, content string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "input")
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("write temp file: %v", err)
	}
	return path
}

func TestRun_WrongArgCount(t *testing.T) {
	tests := []struct {
		name string
		args []string
	}{
		{"zero args", nil},
		{"two args", []string{"a.txt", "b.txt"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var stdout, stderr bytes.Buffer
			fetcher := &fakeFetcher{}

			code := run(tt.args, &stdout, &stderr, fetcher)

			if code != 2 {
				t.Errorf("code = %d, want 2", code)
			}
			if stdout.Len() != 0 {
				t.Errorf("stdout = %q, want empty", stdout.String())
			}
			if stderr.Len() == 0 {
				t.Error("stderr is empty, want a usage message")
			}
			if fetcher.calls != 0 {
				t.Errorf("fetcher called %d times, want 0", fetcher.calls)
			}
		})
	}
}

func TestRun_UnreadablePlanPath(t *testing.T) {
	path := filepath.Join(t.TempDir(), "does-not-exist.txt")
	fetcher := &fakeFetcher{}
	var stdout, stderr bytes.Buffer

	code := run([]string{path}, &stdout, &stderr, fetcher)

	if code != 2 {
		t.Errorf("code = %d, want 2", code)
	}
	if stdout.Len() != 0 {
		t.Errorf("stdout = %q, want empty", stdout.String())
	}
	if fetcher.calls != 0 {
		t.Errorf("fetcher called %d times, want 0", fetcher.calls)
	}
}

func TestRun_EmptyPlan(t *testing.T) {
	path := writeTempFile(t, "this line has no separator\n")
	fetcher := &fakeFetcher{}
	var stdout, stderr bytes.Buffer

	code := run([]string{path}, &stdout, &stderr, fetcher)

	if code != 2 {
		t.Errorf("code = %d, want 2", code)
	}
	if stdout.Len() != 0 {
		t.Errorf("stdout = %q, want empty", stdout.String())
	}
	errOut := stderr.String()
	if !strings.Contains(errOut, "missing '='") {
		t.Errorf("stderr = %q, want the parse warning", errOut)
	}
	if !strings.Contains(errOut, "fatal") {
		t.Errorf("stderr = %q, want a fatal message", errOut)
	}
	if fetcher.calls != 0 {
		t.Errorf("fetcher called %d times, want 0", fetcher.calls)
	}
}

func TestRun_FetchErrors(t *testing.T) {
	path := writeTempFile(t, "Заощадження = 5000\n")

	tests := []struct {
		name string
		err  error
		want string
	}{
		{"missing token", monoclient.ErrMissingToken, "MONO_TOKEN is not set"},
		{"invalid token", fmt.Errorf("token %s rejected: %w", fakeToken, monoclient.ErrInvalidToken), "401"},
		{"rate limited", monoclient.ErrRateLimited, "60 seconds"},
		{"unreachable", monoclient.ErrUnreachable, "could not reach"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var stdout, stderr bytes.Buffer
			fetcher := &fakeFetcher{err: tt.err}

			code := run([]string{path}, &stdout, &stderr, fetcher)

			if code != 2 {
				t.Errorf("code = %d, want 2", code)
			}
			if stdout.Len() != 0 {
				t.Errorf("stdout = %q, want empty", stdout.String())
			}
			errOut := stderr.String()
			if !strings.Contains(errOut, tt.want) {
				t.Errorf("stderr = %q, want to contain %q", errOut, tt.want)
			}
			if strings.Contains(errOut, fakeToken) {
				t.Errorf("stderr leaks the token: %q", errOut)
			}
		})
	}
}

func TestRun_AllMatchedNoWarnings(t *testing.T) {
	path := writeTempFile(t, "Заощадження = 5000\nПодорожі = 3000\n")
	fetcher := &fakeFetcher{jars: []monoclient.Jar{
		{Title: "Заощадження", SendID: "sid-1", CurrencyCode: 980},
		{Title: "Подорожі", SendID: "sid-2", CurrencyCode: 980},
	}}
	var stdout, stderr bytes.Buffer

	code := run([]string{path}, &stdout, &stderr, fetcher)

	if code != 0 {
		t.Errorf("code = %d, want 0; stderr=%q", code, stderr.String())
	}
	if stderr.Len() != 0 {
		t.Errorf("stderr = %q, want empty", stderr.String())
	}
	out := stdout.String()
	for _, want := range []string{"Заощадження", "5000 ₴", "sid-1", "Подорожі", "3000 ₴", "sid-2", "Разом", "8000 ₴"} {
		if !strings.Contains(out, want) {
			t.Errorf("stdout missing %q; got:\n%s", want, out)
		}
	}
}

func TestRun_MixedScenario(t *testing.T) {
	path := writeTempFile(t, "Заощадження = 5000\nТипо = 100\nnotvalidline\n")
	fetcher := &fakeFetcher{jars: []monoclient.Jar{
		{Title: "Заощадження", SendID: "sid-1", CurrencyCode: 980},
	}}
	var stdout, stderr bytes.Buffer

	code := run([]string{path}, &stdout, &stderr, fetcher)

	if code != 1 {
		t.Errorf("code = %d, want 1", code)
	}
	out := stdout.String()
	if !strings.Contains(out, "Заощадження") || !strings.Contains(out, "5000 ₴") {
		t.Errorf("stdout missing matched row: %q", out)
	}
	if strings.Contains(out, "Типо") {
		t.Errorf("stdout unexpectedly contains an unmatched entry: %q", out)
	}
	errOut := stderr.String()
	for _, want := range []string{"missing '='", "Типо", "planned", "5100 ₴", "100 ₴", "1 jar"} {
		if !strings.Contains(errOut, want) {
			t.Errorf("stderr missing %q; got:\n%s", want, errOut)
		}
	}
}

func TestRun_ZeroMatched(t *testing.T) {
	path := writeTempFile(t, "Типо = 100\n")
	fetcher := &fakeFetcher{jars: []monoclient.Jar{
		{Title: "Заощадження", SendID: "sid-1", CurrencyCode: 980},
	}}
	var stdout, stderr bytes.Buffer

	code := run([]string{path}, &stdout, &stderr, fetcher)

	if code != 2 {
		t.Errorf("code = %d, want 2", code)
	}
	out := stdout.String()
	if !strings.Contains(out, "Разом") || !strings.Contains(out, "0 ₴") {
		t.Errorf("stdout = %q, want the empty table with a 0 ₴ total", out)
	}
	if !strings.Contains(stderr.String(), "Типо") {
		t.Errorf("stderr = %q, want the unknown-name warning", stderr.String())
	}
}

func TestRun_FetcherCalledExactlyOnce(t *testing.T) {
	path := writeTempFile(t, "Заощадження = 5000\nПодорожі = 3000\nПодушка = 1500\n")
	fetcher := &fakeFetcher{jars: []monoclient.Jar{
		{Title: "Заощадження", SendID: "sid-1", CurrencyCode: 980},
		{Title: "Подорожі", SendID: "sid-2", CurrencyCode: 980},
		{Title: "Подушка", SendID: "sid-3", CurrencyCode: 980},
	}}
	var stdout, stderr bytes.Buffer

	run([]string{path}, &stdout, &stderr, fetcher)

	if fetcher.calls != 1 {
		t.Errorf("fetcher called %d times, want exactly 1", fetcher.calls)
	}
}

func TestRun_EndToEndWithRealFixtureFetcher(t *testing.T) {
	fixturePath := writeTempFile(t, `{"jars":[
		{"title":"Заощадження","sendId":"sid-save","currencyCode":980},
		{"title":"Подорожі","sendId":"sid-trip-usd","currencyCode":840}
	]}`)
	t.Setenv("MONO_CLIENT_INFO_FILE", fixturePath)
	t.Setenv("MONO_TOKEN", "")

	planPath := writeTempFile(t, "Заощадження = 5000\nПодорожі = 3000\nТипо = 100\n")

	var stdout, stderr bytes.Buffer
	code := run([]string{planPath}, &stdout, &stderr, monoclient.NewJarFetcher())

	if code != 1 {
		t.Errorf("code = %d, want 1; stdout=%q stderr=%q", code, stdout.String(), stderr.String())
	}
	out := stdout.String()
	if !strings.Contains(out, "Заощадження") || !strings.Contains(out, "5000 ₴") || !strings.Contains(out, "sid-save") {
		t.Errorf("stdout missing matched row: %q", out)
	}
	if !strings.Contains(out, "Разом") {
		t.Errorf("stdout missing total: %q", out)
	}
	errOut := stderr.String()
	for _, want := range []string{"Подорожі", "Типо", "planned", "8100 ₴", "3100 ₴"} {
		if !strings.Contains(errOut, want) {
			t.Errorf("stderr missing %q; got:\n%s", want, errOut)
		}
	}
}
