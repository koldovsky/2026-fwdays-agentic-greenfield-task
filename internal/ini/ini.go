// Package ini is a minimal, dependency-free INI reader for the AWS and GCP
// config files. It is intentionally lenient: malformed lines are skipped and a
// missing file is reported, never returned as an error, so the prompt is never
// broken.
package ini

import (
	"bufio"
	"bytes"
	"os"
	"strings"
)

// File maps a section name to its key/value pairs. Keys that appear before any
// "[section]" header live under the default section "".
type File map[string]map[string]string

// Parse parses INI content. It never fails; unparseable lines are skipped.
// Sections are "[name]", entries are "key = value", and full-line comments
// start with '#' or ';'.
func Parse(data []byte) File {
	f := File{}
	section := ""

	sc := bufio.NewScanner(bytes.NewReader(data))
	sc.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || line[0] == '#' || line[0] == ';' {
			continue
		}
		if line[0] == '[' && strings.HasSuffix(line, "]") {
			section = strings.TrimSpace(line[1 : len(line)-1])
			continue
		}
		eq := strings.IndexByte(line, '=')
		if eq < 0 {
			continue
		}
		key := strings.TrimSpace(line[:eq])
		if key == "" {
			continue
		}
		if f[section] == nil {
			f[section] = map[string]string{}
		}
		f[section][key] = strings.TrimSpace(line[eq+1:])
	}
	return f
}

// ParseFile reads and parses path. ok=false means the file was missing or
// unreadable; callers treat that as "no value".
func ParseFile(path string) (File, bool) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, false
	}
	return Parse(data), true
}

// Sections returns the section names in file order, deduplicated. The default
// (pre-header) section "" is not included — callers listing sections care only
// about named ones (e.g. AWS profiles).
func Sections(data []byte) []string {
	var names []string
	seen := map[string]bool{}

	sc := bufio.NewScanner(bytes.NewReader(data))
	sc.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if len(line) < 2 || line[0] != '[' || !strings.HasSuffix(line, "]") {
			continue
		}
		name := strings.TrimSpace(line[1 : len(line)-1])
		if name == "" || seen[name] {
			continue
		}
		seen[name] = true
		names = append(names, name)
	}
	return names
}

// Get returns the value for section/key. The default (pre-header) section is "".
func (f File) Get(section, key string) (string, bool) {
	s, ok := f[section]
	if !ok {
		return "", false
	}
	v, ok := s[key]
	return v, ok
}
