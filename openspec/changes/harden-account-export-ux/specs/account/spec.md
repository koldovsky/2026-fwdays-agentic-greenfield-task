# account (delta)

## MODIFIED Requirements

### Requirement: GDPR data export — client action

The system SHALL replace the anchor-based export CTA with a fetch-based client
action. On success (HTTP 200) the action SHALL extract the response as a blob and
trigger a browser file download without navigating away from the account page. On
any failure (non-200 response or network error) the action SHALL show a calm inline
error message in the GDPR section of the profile page; the browser SHALL NOT
navigate to the raw server response under any condition. The action SHALL show a
loading state while the request is in flight. Implements NFR-GDPR-01, NFR-OBS-01.

#### Scenario: Successful export triggers a download

- **WHEN** a signed-in user activates the export action and the server responds 200
- **THEN** the response body is downloaded as a file (e.g. `vouch-export.json`)
- **AND** the account profile page remains visible throughout

#### Scenario: Server failure surfaces an inline error

- **WHEN** a signed-in user activates the export action and the server responds with
  a non-200 status (e.g. 500 `{ "error": "export_failed" }`)
- **THEN** a calm error message is shown inline in the GDPR section
- **AND** the browser does not navigate to the raw JSON error body

#### Scenario: Network failure surfaces an inline error

- **WHEN** a signed-in user activates the export action and the network request
  throws (e.g. offline, timeout)
- **THEN** a calm error message is shown inline in the GDPR section
- **AND** the browser does not navigate away

#### Scenario: Loading state while request is in flight

- **WHEN** the export action has been activated and the response has not yet arrived
- **THEN** the export control shows a pending state and cannot be double-activated

---

### Requirement: GDPR data export — per-profile decrypt resilience

The server SHALL handle a per-profile decryption failure (e.g. rotated or corrupt
`CV_ENCRYPTION_KEY`) without aborting the whole export. For each CV profile where
decryption fails, the export SHALL set `rawText: null` and `decryptionFailed: true`
on that profile entry and continue assembling the rest of the export. A partial
export that includes all readable data is preferred over a total 500 failure.
No key material, error message, or CV text SHALL appear in any log line or response
body beyond the `decryptionFailed` flag. Implements NFR-GDPR-01, NFR-SEC-01,
NFR-OBS-01, BC-PRIVACY-02.

#### Scenario: One unreadable profile does not block the rest

- **WHEN** a signed-in user with two CV profiles initiates an export and one profile
  has a corrupt or rotated encryption key
- **THEN** the response is 200 with a JSON body containing both profiles
- **AND** the unreadable profile has `rawText: null` and `decryptionFailed: true`
- **AND** the readable profile has its decrypted `rawText` intact

#### Scenario: All profiles unreadable still returns 200

- **WHEN** every CV profile for a user fails decryption
- **THEN** the response is 200 with a JSON body containing all profiles, each with
  `rawText: null` and `decryptionFailed: true`
- **AND** the response status is not 500

#### Scenario: Decrypt failure is never logged with key material

- **WHEN** a profile decryption throws during export assembly
- **THEN** the server logs a structured error with no `CV_ENCRYPTION_KEY` value,
  no CV plaintext, and no blob content — only the profile id and a stable error code

---

### Requirement: Export i18n strings

The `profile` section of the i18n dictionary SHALL include `exportError` (calm
failure copy, NFR-OBS-01) and `exportPending` (in-flight state label) in both
Ukrainian and English. The existing `exportAction` key is unchanged. Implements
NFR-I18N-01, NFR-OBS-01.

#### Scenario: Pending state uses the pending string

- **WHEN** the export request is in flight
- **THEN** the export control renders the `exportPending` string in the resolved locale

#### Scenario: Error state uses the error string

- **WHEN** the export fails
- **THEN** the error message renders the `exportError` string in the resolved locale
- **AND** the string is calm and does not mention internal error codes or server state
