# improve-PD-17

- Defect: review-gate reviewed its own review-findings.json evidence artifact, which lags HEAD by one run, yielding a self-referential "stale artifact" confirmed finding every pass — clean:true unreachable.
- Fix: reviewers are told to IGNORE **/review-findings.json.
- Refs: PD-17. Approved: Serhii, in-session.
