## ADDED Requirements

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
The subcommand SHALL only switch to a context that exists in the `contexts[]` of the parsed kubeconfig files. For an unknown context it SHALL print an error naming the available contexts to stderr, SHALL NOT modify any file, and SHALL exit with code 2. If the write-target file cannot be read or parsed as kubeconfig YAML, the subcommand SHALL refuse to write, print an error, and exit with code 1. The word `list` is reserved for the listing form and SHALL never be treated as a context name to switch to.

#### Scenario: Unknown context
- **WHEN** the kubeconfig defines only `kind-1` and `kind-2`, and the user runs `omnictx kube kind-3`
- **THEN** stderr names the available contexts (`kind-1`, `kind-2`), no file is modified, and the exit code is 2

#### Scenario: Broken kubeconfig refuses the write
- **WHEN** the write-target file contains invalid YAML and the user runs `omnictx kube <ctx>`
- **THEN** no file is modified, an error is printed to stderr, and the exit code is 1

#### Scenario: Context named "list" is not switchable
- **WHEN** the kubeconfig defines a context literally named `list` and the user runs `omnictx kube list`
- **THEN** the contexts are listed (the listing form wins); no file is modified

### Requirement: Print the current context with `omnictx kube`
When invoked with no argument, the subcommand SHALL print the current context name — resolved with the existing read logic (first file in the `$KUBECONFIG` list that sets `current-context`, else `~/.kube/config`) — to stdout followed by a newline, and exit 0. When no context is set or no kubeconfig is readable, it SHALL print nothing on stdout and exit 0.

#### Scenario: Current context is printed
- **WHEN** the kubeconfig sets `current-context: kind-1` and the user runs `omnictx kube`
- **THEN** stdout is `kind-1` and the exit code is 0

#### Scenario: No context configured
- **WHEN** no kubeconfig file exists and the user runs `omnictx kube`
- **THEN** stdout is empty and the exit code is 0

### Requirement: List available contexts with `omnictx kube list`
The subcommand form `omnictx kube list` SHALL print every context name found across all files in the `$KUBECONFIG` list (deduplicated, in file-then-definition order), one per line, marking the current context with a `* ` prefix. Unreadable or broken files are skipped. With no contexts found, it SHALL print nothing and exit 0.

#### Scenario: Contexts across multiple files with the current one marked
- **WHEN** `KUBECONFIG=a.yaml:b.yaml` where `a.yaml` defines `kind-1` (current) and `b.yaml` defines `kind-2`, and the user runs `omnictx kube list`
- **THEN** stdout contains `* kind-1` and `  kind-2` (one per line) and the exit code is 0

#### Scenario: Broken file is skipped
- **WHEN** one of the `$KUBECONFIG` files is invalid YAML and the user runs `omnictx kube list`
- **THEN** contexts from the readable files are listed and the exit code is 0

### Requirement: Render mode stays read-only and never breaks the prompt
Kubeconfig writes SHALL happen only in the `kube <context>` subcommand on an explicit user command. Render mode SHALL never write to any kubeconfig file, and the never-break-the-prompt invariant (any render error → skip segment, exit 0) SHALL be unaffected by this change.

#### Scenario: Render never writes
- **WHEN** a render invocation runs (with or without `--shell`)
- **THEN** no kubeconfig file is opened for writing

#### Scenario: Too many arguments is a usage error
- **WHEN** the user runs `omnictx kube a b`
- **THEN** a usage message is printed to stderr and the exit code is 2
