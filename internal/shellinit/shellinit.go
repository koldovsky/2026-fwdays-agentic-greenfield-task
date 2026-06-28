// Package shellinit generates the shell integration code emitted by
// `omnictx init <bash|zsh>`. The generated snippet is meant to be eval'd from
// an rc file and must be idempotent and non-destructive to the user's prompt.
package shellinit

import (
	"embed"
	"fmt"
	"strings"
	"text/template"
)

//go:embed templates/*.tmpl
var templatesFS embed.FS

// templateData is the data passed to the shell templates.
type templateData struct {
	// Cmd is the command used to invoke omnictx from the prompt hook.
	Cmd string
}

// Generate returns the shell integration code for the given shell ("bash" or
// "zsh"). cmd is the command name used inside the snippet (e.g. "omnictx").
func Generate(shell, cmd string) (string, error) {
	if cmd == "" {
		cmd = "omnictx"
	}

	var name string
	switch shell {
	case "bash":
		name = "templates/bash.tmpl"
	case "zsh":
		name = "templates/zsh.tmpl"
	default:
		return "", fmt.Errorf("unsupported shell %q (want bash or zsh)", shell)
	}

	tmpl, err := template.ParseFS(templatesFS, name)
	if err != nil {
		return "", err
	}
	var sb strings.Builder
	if err := tmpl.Execute(&sb, templateData{Cmd: cmd}); err != nil {
		return "", err
	}
	return sb.String(), nil
}
