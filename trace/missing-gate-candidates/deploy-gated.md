# Missing gate candidate: deploy-gated

> AUTO-DRAFTED by check-acceptance-methods --mode=existence. A requirement
> declares this acceptance method but no real mechanism exists. Implement the
> mechanism (or obtain a human waiver under docs/qa/waivers/) before Phase 4.

- Method: deploy-gated
- Declared by: NFR-PERF-01, NFR-PERF-02
- Threshold: n/a (default — none parsed from text)
- Reference URL: (none found in specs — fill in)
- Breakpoints: TODO (e.g. 1440x900, 390x844)
- Masks: TODO (dynamic regions to exclude)
- Expected mechanism: npm script one of [deploy:verify, check:deploy] or file matching [scripts/check-deploy*.*, .github/workflows/*deploy*]
- Expected artifact: docs/qa/deploy-verification.json | docs/qa/deploy-verification.md | docs/qa/deploy-report.*
