package ini

import "testing"

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
