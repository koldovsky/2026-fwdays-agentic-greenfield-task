## MODIFIED Requirements

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
