package cloud

import "testing"

// fakeProvider is a controllable Provider for selection tests.
type fakeProvider struct {
	key     string
	present bool
	text    string
}

func (f fakeProvider) Key() string       { return f.key }
func (f fakeProvider) Label(bool) string { return f.key + ":" }
func (f fakeProvider) Present(LookupEnv, string) bool {
	return f.present
}
func (f fakeProvider) Read(LookupEnv, string) Reading {
	return Reading{Text: f.text, OK: f.text != ""}
}

func noEnv(string) (string, bool) { return "", false }

func TestSelect(t *testing.T) {
	az := fakeProvider{key: "azure", present: false, text: "sub"}
	aws := fakeProvider{key: "aws", present: true, text: "prof"}
	gcp := fakeProvider{key: "gcp", present: true, text: "proj"}
	providers := []Provider{az, aws, gcp}

	tests := []struct {
		name    string
		choice  string
		wantKey string
		wantOK  bool
	}{
		{"explicit azure pinned even if absent", "azure", "azure", true},
		{"explicit aws", "aws", "aws", true},
		{"explicit gcp", "gcp", "gcp", true},
		{"none disables", None, "", false},
		{"auto picks first present by priority", Auto, "aws", true},
		{"unknown behaves like auto", "bogus", "aws", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := Select(providers, tt.choice, noEnv, "/home")
			if ok != tt.wantOK {
				t.Fatalf("ok = %v, want %v", ok, tt.wantOK)
			}
			if ok && got.Key() != tt.wantKey {
				t.Fatalf("key = %q, want %q", got.Key(), tt.wantKey)
			}
		})
	}
}

func TestSelectAutoNonePresent(t *testing.T) {
	providers := []Provider{
		fakeProvider{key: "azure"},
		fakeProvider{key: "aws"},
		fakeProvider{key: "gcp"},
	}
	if _, ok := Select(providers, Auto, noEnv, "/home"); ok {
		t.Fatal("auto with no provider present should select nothing")
	}
}

func TestSelectAutoPriorityAzureFirst(t *testing.T) {
	// When several are present, azure wins (priority azure -> aws -> gcp).
	providers := []Provider{
		fakeProvider{key: "azure", present: true, text: "sub"},
		fakeProvider{key: "aws", present: true, text: "prof"},
	}
	got, ok := Select(providers, Auto, noEnv, "/home")
	if !ok || got.Key() != "azure" {
		t.Fatalf("auto = %v/%v, want azure", got, ok)
	}
}
