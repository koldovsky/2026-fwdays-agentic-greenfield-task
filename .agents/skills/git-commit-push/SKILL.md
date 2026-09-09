---
name: git-commit-push
description: Stages changes, prompts/generates a conventional commit message, commits the changes, and pushes to the current local branch.
---

# Git Conventional Commit & Push Skill

This skill guides you through the process of staging your code changes, generating a commit message that complies with the Conventional Commits v1.0.0 specification, creating the commit, and pushing it to your current active remote branch.

## Conventional Commits Reference
Commit messages must follow this structure:
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: A new feature (corresponds to `MINORS` in semantic versioning).
- `fix`: A bug fix (corresponds to `PATCHES` in semantic versioning).
- `docs`: Documentation-only changes.
- `style`: Changes that do not affect the meaning of the code (formatting, missing semi-colons, white-space).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves performance.
- `test`: Adding missing tests or correcting existing tests.
- `build`: Changes that affect the build system or external dependencies.
- `ci`: Changes to CI configuration files and scripts.
- `chore`: Other changes that do not modify src or test files.
- `revert`: Reverts a previous commit.

## Step-by-Step Instructions

### 1. Check Git Status
Determine which files have been modified, created, or deleted:
```powershell
git status
```

### 2. Stage Changes
Stage the relevant modified files. Ensure you do not stage temporary scratch files or untracked build artifacts unless they are part of the target delivery.
```powershell
git add <paths-to-stage>
```

### 3. Generate Commit Message
Analyze the diff of the staged changes:
```powershell
git diff --cached
```
Draft a commit message following the specification:
1. **Header Line**: Keep it under 50 characters, lowercase (except for acronyms/proper nouns), written in the imperative mood (e.g., `feat(auth): add JWT login support`).
2. **Body (Optional)**: If the change is complex, add a blank line after the header, and write a detailed description of the "what" and "why" behind the changes.
3. **Breaking Change (Optional)**: If the commit introduces a breaking change, append a `!` after the type/scope (e.g., `feat(auth)!: replace session cookies with JWT`) or include `BREAKING CHANGE: <description>` in the footer.

### 4. Create Commit
Commit the staged changes with the generated commit message:
```powershell
git commit -m "<header-line>" -m "<body-line-if-needed>"
```

### 5. Determine Current Branch & Push
Identify your current branch name:
```powershell
git branch --show-current
```
Push the committed changes to the upstream remote branch:
```powershell
git push origin <branch-name>
```
