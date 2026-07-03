# kube-context-cli

## Purpose

The `omnictx kube` subcommand: safe kube-context switching (`omnictx kube <context>`), printing the current context (no argument), and listing available contexts (`omnictx kube list`). This is the only place omnictx writes to a file it does not own — the kubeconfig — and it does so only on an explicit user command, with validation, single-line surgery, and an atomic write. Render mode stays strictly read-only.

## Requirements

### Requirement: Switch the current kube-context via `omnictx kube <context>`
The CLI SHALL provide a subcommand `omnictx kube <context>` that sets `current-context: <context>` in the kubeconfig and exits with code 0. The edit SHALL be a single-line replacement of the top-level `current-context:` line (appended if absent), preserving all other content including comments, ordering, and formatting. The write SHALL be atomic (write to a temp file in the same directory, then rename over the original).

#### Scenario: Switch to another existing context
- **WHEN** the kubeconfig defines contexts `kind-1` and `kind-2` with `current-context: kind-1`, and the user runs `omnictx kube kind-2`
- **THEN** the file contains `current-context: kind-2`, every other line (including comments) is byte-identical, and the exit code is 0

#### Scenario: File has no current-context line yet
- **WHEN** the kubeconfig defines context `kind-1` but no `current-context` line, and the user runs `omnictx kube kind-1`
- **THEN** a `current-context: kind-1` line is added, the rest of the file is unchanged, and the exit code is 0

#### Scenario: Switch is visible to the next render
- **WHEN** `omnictx kube kind-2` has succeeded and a render invocation follows
- **THEN** the kube segment shows `kind-2` (with its namespace, if any)

### Requirement: Choose the write target from the $KUBECONFIG list like kubectl
When `KUBECONFIG` lists multiple files (colon-separated), the subcommand SHALL write to the first file in the list that sets a non-empty `current-context`; if none does, it SHALL write to the first file. Other files SHALL never be modified. Without `KUBECONFIG`, the target is `~/.kube/config`. This mirrors the existing read logic (first file with `current-context` wins).

#### Scenario: Second file holds the current-context
- **WHEN** `KUBECONFIG=a.yaml:b.yaml`, only `b.yaml` sets `current-context`, and the user runs `omnictx kube <ctx>` for a context defined in either file
- **THEN** `b.yaml` is updated and `a.yaml` is byte-identical to before

#### Scenario: No file holds a current-context
- **WHEN** `KUBECONFIG=a.yaml:b.yaml`, neither file sets `current-context`, and the user runs `omnictx kube <ctx>`
- **THEN** `a.yaml` (the first file) gains the `current-context` line and `b.yaml` is unmodified

### Requirement: Validate the target context and refuse unsafe writes
The subcommand SHALL only switch to a context that exists in the `contexts[]` of the parsed kubeconfig files. For an unknown context it SHALL print an error naming the available contexts to stderr, SHALL NOT modify any file, and SHALL exit with code 2. If the write-target file cannot be read or parsed as kubeconfig YAML, the subcommand SHALL refuse to write, print an error, and exit with code 1. The words `list`, `on`, and `off` are reserved (checked before context-name lookup): `list` triggers the listing form, `on`/`off` trigger the display toggle, and contexts literally named `list`, `on`, or `off` SHALL never be switchable via this subcommand.

#### Scenario: Unknown context
- **WHEN** the kubeconfig defines only `kind-1` and `kind-2`, and the user runs `omnictx kube kind-3`
- **THEN** stderr names the available contexts (`kind-1`, `kind-2`), no file is modified, and the exit code is 2

#### Scenario: Broken kubeconfig refuses the write
- **WHEN** the write-target file contains invalid YAML and the user runs `omnictx kube <ctx>`
- **THEN** no file is modified, an error is printed to stderr, and the exit code is 1

#### Scenario: Context named "list" is not switchable
- **WHEN** the kubeconfig defines a context literally named `list` and the user runs `omnictx kube list`
- **THEN** the contexts are listed (the listing form wins); no file is modified

#### Scenario: Context named "off" is not switchable
- **WHEN** the kubeconfig defines a context literally named `off` and the user runs `omnictx kube off`
- **THEN** the display toggle wins (the omnictx config gains `kube: false`); no kubeconfig file is modified

### Requirement: Print the current context with `omnictx kube`
When invoked with no argument, the subcommand SHALL print the current context name — resolved with the existing read logic (first file in the `$KUBECONFIG` list that sets `current-context`, else `~/.kube/config`) — to stdout followed by a newline, and exit 0. When no context is set or no kubeconfig is readable, it SHALL print nothing on stdout and exit 0.

#### Scenario: Current context is printed
- **WHEN** the kubeconfig sets `current-context: kind-1` and the user runs `omnictx kube`
- **THEN** stdout is `kind-1` and the exit code is 0

#### Scenario: No context configured
- **WHEN** no kubeconfig file exists and the user runs `omnictx kube`
- **THEN** stdout is empty and the exit code is 0

### Requirement: List available contexts with `omnictx kube list`
The subcommand form `omnictx kube list` SHALL print a table of every context found across all files in the `$KUBECONFIG` list (deduplicated by name, first definition wins, in file-then-definition order; unreadable or broken files skipped). The table SHALL have the columns `CURRENT`, `NAME`, `CLUSTER`, `AUTHINFO`, `NAMESPACE` (in that order), aligned with `text/tabwriter`-style padding, with a header row. The current context SHALL be marked with `*` in the `CURRENT` column; values absent from the kubeconfig (cluster, user, or namespace) SHALL render as blank cells. With no contexts found, the command SHALL print nothing (no header) and exit 0.

#### Scenario: Table with the current context marked
- **WHEN** the kubeconfig defines `kind-1` (cluster `kind-1`, user `kind-1-user`, namespace `payments`) and `kind-2` (cluster `kind-2`, user `kind-2-user`, namespace `staging`) with `current-context: kind-2`, and the user runs `omnictx kube list`
- **THEN** stdout is a table whose header row contains `CURRENT`, `NAME`, `CLUSTER`, `AUTHINFO`, `NAMESPACE`; the `kind-2` row starts with `*`; the `kind-1` row has a blank CURRENT cell; and the exit code is 0

#### Scenario: Missing fields render as blank cells
- **WHEN** a context defines no namespace and no user, and the user runs `omnictx kube list`
- **THEN** its row shows blank AUTHINFO and NAMESPACE cells and the table stays aligned

#### Scenario: Contexts across multiple files
- **WHEN** `KUBECONFIG=a.yaml:b.yaml` where `a.yaml` defines `kind-1` (current) and `b.yaml` defines `kind-2`, and the user runs `omnictx kube list`
- **THEN** the table lists `kind-1` (marked `*`) before `kind-2` and the exit code is 0

#### Scenario: Broken file is skipped
- **WHEN** one of the `$KUBECONFIG` files is invalid YAML and the user runs `omnictx kube list`
- **THEN** contexts from the readable files are listed and the exit code is 0

#### Scenario: No contexts found
- **WHEN** no kubeconfig file is readable and the user runs `omnictx kube list`
- **THEN** stdout is empty (no header row) and the exit code is 0

### Requirement: Render mode stays read-only and never breaks the prompt
Kubeconfig writes SHALL happen only in the `kube <context>` subcommand on an explicit user command. Render mode SHALL never write to any kubeconfig file, and the never-break-the-prompt invariant (any render error → skip segment, exit 0) SHALL be unaffected by this change.

#### Scenario: Render never writes
- **WHEN** a render invocation runs (with or without `--shell`)
- **THEN** no kubeconfig file is opened for writing

#### Scenario: Too many arguments is a usage error
- **WHEN** the user runs `omnictx kube a b`
- **THEN** a usage message is printed to stderr and the exit code is 2

### Requirement: Toggle the kube segment with `omnictx kube on|off`
The subcommand forms `omnictx kube on` and `omnictx kube off` SHALL persist `kube: true` / `kube: false` to the omnictx config file (path resolved as `OMNICTX_CONFIG` > `~/.config/omnictx/config.yaml`) via the same single-line mechanism as `omnictx on/off`, preserving other keys and comments, creating the file/dir if absent, and exiting 0. These forms SHALL NOT touch any kubeconfig file. The kube segment SHALL render only when the `segments` list contains `kube` AND the resolved `kube` value is true; when the kube segment is hidden, the namespace suffix disappears with it.

#### Scenario: kube off hides the segment persistently
- **WHEN** the user runs `omnictx kube off` and a render invocation follows with a working kubeconfig
- **THEN** the omnictx config contains `kube: false`, the rendered output contains no kube-context and no namespace, and both invocations exit 0

#### Scenario: kube on restores the segment
- **WHEN** the omnictx config contains `kube: false` and the user runs `omnictx kube on`
- **THEN** the config contains `kube: true` and a subsequent render shows the kube segment again

#### Scenario: Cloud segment is unaffected
- **WHEN** the user runs `omnictx kube off` and a cloud provider is detected
- **THEN** the cloud segment still renders

### Requirement: Session-scoped kube toggle via OMNICTX_KUBE
The configuration resolution SHALL support a `kube` boolean (default `true`) with the standard precedence: `OMNICTX_KUBE` env var > `kube:` config key > default. Boolean values for `OMNICTX_KUBE` — and for the other boolean env vars `OMNICTX_ENABLED` and `OMNICTX_ICONS` — SHALL accept `on`/`off` (case-insensitive) in addition to `strconv.ParseBool` forms. An invalid value SHALL be ignored (lower layer wins) with a debug note, never an error.

#### Scenario: Env hides the segment for the session
- **WHEN** the config has no `kube:` key and `OMNICTX_KUBE=off` is set during a render
- **THEN** the kube segment (and namespace) is not rendered

#### Scenario: Env overrides the persisted value
- **WHEN** the config contains `kube: false` and `OMNICTX_KUBE=on` is set during a render
- **THEN** the kube segment renders

#### Scenario: on/off accepted by all boolean env vars
- **WHEN** `OMNICTX_ENABLED=off` is set during a render
- **THEN** the output is empty and the exit code is 0

#### Scenario: Invalid boolean is ignored
- **WHEN** `OMNICTX_KUBE=banana` is set and the config contains `kube: true`
- **THEN** the kube segment renders (the invalid env layer is ignored)

### Requirement: `kube list` warns about unparsable kubeconfig files
The form `omnictx kube list` SHALL print one `omnictx: warning:` line to stderr for every file in the `$KUBECONFIG` list that exists but cannot be parsed as kubeconfig YAML, naming the file. Contexts from the readable files SHALL still be listed on stdout and the exit code SHALL remain 0. Render mode SHALL remain completely silent on stderr regardless of kubeconfig state.

#### Scenario: One broken file among several
- **WHEN** `KUBECONFIG=a.yaml:b.yaml` where `a.yaml` is invalid YAML and `b.yaml` defines contexts, and the user runs `omnictx kube list`
- **THEN** stdout lists the contexts from `b.yaml`, stderr contains a warning naming `a.yaml`, and the exit code is 0

#### Scenario: Missing files are not warned about
- **WHEN** a `$KUBECONFIG` entry points to a file that does not exist and the user runs `omnictx kube list`
- **THEN** stderr contains no warning for that entry (absence is a normal state, not corruption)

#### Scenario: Render stays silent
- **WHEN** every kubeconfig file is unparsable and a render invocation runs
- **THEN** stderr is empty and the exit code is 0
