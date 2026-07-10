"""SQLAlchemy async repositories.

**The user_id-scoped rule (FR-AUTH-07, NFR-SEC-03, architecture §8.3).** Every
repository method that reads or writes a user's data takes ``user_id`` (from the
``CurrentUser`` auth dependency) and scopes every query by it. No data-repo method
exists without a ``user_id`` parameter — this is how per-user isolation is enforced
server-side, and every later data slice (sessions, categories, metrics, coach)
must follow it.

The auth repos here carry the *only* sanctioned exceptions, because they operate at
or before the identity boundary — they establish ``user_id`` rather than consume it:

- ``UserRepository.get_by_email`` / ``.create`` — register + login bootstrap.
- ``UserSessionRepository.get_active_by_token`` — resolves the session cookie to a
  session row (this method *produces* the ``user_id``).

Every other method here is user_id-scoped, demonstrating the rule.
"""
