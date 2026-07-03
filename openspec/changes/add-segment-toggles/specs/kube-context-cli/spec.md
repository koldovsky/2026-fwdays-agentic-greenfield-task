## MODIFIED Requirements

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

## ADDED Requirements

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
