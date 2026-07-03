## ADDED Requirements

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
