#!/usr/bin/env bash
# Narrated demo for the course video. Each command is shown as a `$ ...` prompt line
# before it runs, so the recording clearly displays what is being executed.
# Record with:
#   asciinema rec docs/demo.cast --overwrite --command "bash scripts/demo.sh"
cd "$(dirname "$0")/.."

banner() { printf "\n\033[1;32m== %s ==\033[0m\n" "$1"; sleep 1.3; }
cmd()    { printf "\n\033[1;35m\$ %s\033[0m\n" "$1"; sleep 1.0; }

banner "tf-guard — keyless, offline terraform plan risk linter"
printf "built: spec -> failing tests -> green -> eval -> independent review\n"
sleep 1.2

banner "1. Deterministic core — verified by TESTS"
cmd "npm test"
node --import tsx --test tests/*.test.ts 2>&1 | tail -6
sleep 1.4

banner "2. Summary surface — verified by EVALS (rubric + ratchet, no exact equality)"
cmd "npm run eval"
npx tsx evals/run.ts
sleep 1.4

banner "3. Run it on a sample plan"
cmd "tf-guard tests/fixtures/plan-mixed.json"
npx tsx src/cli.ts tests/fixtures/plan-mixed.json && rc=0 || rc=$?
printf "\n\033[1;33mexit code: %s\033[0m  (1 = high risk -> gates CI, BC-EXIT-01)\n" "$rc"
sleep 1.4

banner "4. Machine-readable report"
cmd "tf-guard tests/fixtures/plan-mixed.json --json | head -18"
npx tsx src/cli.ts tests/fixtures/plan-mixed.json --json | head -18
sleep 1.4

banner "5. The same gate runs in CI on every push/PR — for real"
cmd "grep -nE 'npm (ci|run)|exit 1' .github/workflows/ci.yml"
grep -nE 'npm (ci|run)|exit 1' .github/workflows/ci.yml
sleep 1.4

banner "Context lives in the repo, not the chat"
cmd "ls — rules · requirements · ADR · specs · skill · review trace"
ls -1 AGENTS.md docs/requirements.md docs/adr/0001-risk-score-model.md \
      openspec/changes/add-risk-scoring/proposal.md \
      .agents/skills/tf-risk-rank/SKILL.md docs/review-trace.md
sleep 1.2

banner "the agent forgets; the repo doesn't"
