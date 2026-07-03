-- Auth storage (FR-AUTH-01/02). Credentials and OAuth links hang off users with
-- ON DELETE CASCADE, so account delete (NFR-GDPR-02) removes them too. Password
-- hashes are salted-scrypt envelopes (never plaintext, NFR-SEC).

CREATE TABLE credentials (
  user_id       uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash text NOT NULL
);

CREATE TABLE oauth_accounts (
  provider            text NOT NULL CHECK (provider IN ('google')),
  provider_account_id text NOT NULL,
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (provider, provider_account_id)
);
CREATE INDEX oauth_accounts_user_id_idx ON oauth_accounts(user_id);
