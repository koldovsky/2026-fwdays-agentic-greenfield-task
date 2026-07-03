package ini

import (
	"reflect"
	"testing"
)

func TestParseSectionsAndDefault(t *testing.T) {
	in := []byte(`
# a comment
; another comment
key0 = top-level

[core]
project = my-project
account = me@example.com

[profile prod]
region = eu-west-1
`)
	f := Parse(in)

	if v, ok := f.Get("", "key0"); !ok || v != "top-level" {
		t.Errorf("default-section key0 = %q/%v, want top-level", v, ok)
	}
	if v, ok := f.Get("core", "project"); !ok || v != "my-project" {
		t.Errorf("core.project = %q/%v, want my-project", v, ok)
	}
	if v, ok := f.Get("profile prod", "region"); !ok || v != "eu-west-1" {
		t.Errorf("[profile prod].region = %q/%v, want eu-west-1", v, ok)
	}
}

func TestParseSpacingAndTrim(t *testing.T) {
	f := Parse([]byte("[s]\n  key   =   value with spaces   \n"))
	if v, _ := f.Get("s", "key"); v != "value with spaces" {
		t.Errorf("trimmed value = %q, want %q", v, "value with spaces")
	}
}

func TestParseMissingAndBroken(t *testing.T) {
	// Lines without '=', an unterminated section, and blanks must be skipped,
	// never panic, and never invent values.
	f := Parse([]byte("[unterminated\nnonsense line\n= no key\nkey only\n"))
	if len(f) != 0 {
		t.Errorf("broken input should yield no usable entries, got %v", f)
	}
}

func TestGetUnknown(t *testing.T) {
	f := Parse([]byte("[core]\nproject = p\n"))
	if _, ok := f.Get("core", "missing"); ok {
		t.Error("missing key should report ok=false")
	}
	if _, ok := f.Get("nosuch", "project"); ok {
		t.Error("missing section should report ok=false")
	}
}

func TestParseFileMissing(t *testing.T) {
	if _, ok := ParseFile("/definitely/not/here.ini"); ok {
		t.Error("missing file should report ok=false")
	}
}

func TestSections(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want []string
	}{
		{"ordered names", "[b]\nk=v\n[a]\nk=v\n", []string{"b", "a"}},
		{"default section excluded", "k=v\n[one]\nk=v\n", []string{"one"}},
		{"duplicates dropped", "[x]\n[y]\n[x]\n", []string{"x", "y"}},
		{"comments and broken lines skipped", "# [nope]\n; [also nope]\n[real]\nnot-a-header]\n", []string{"real"}},
		{"aws-style profile names kept verbatim", "[default]\n[profile prod]\n", []string{"default", "profile prod"}},
		{"empty input", "", nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Sections([]byte(tt.in))
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Sections() = %v, want %v", got, tt.want)
			}
		})
	}
}
