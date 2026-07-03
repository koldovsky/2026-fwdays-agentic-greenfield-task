## ADDED Requirements

### Requirement: Database Connection and Drizzle ORM Setup
The system SHALL use Drizzle ORM to establish and manage connections to the PostgreSQL database (Neon or Supabase). The connection manager SHALL handle Serverless environments by reusing connections and preventing connection exhaustion under concurrent requests.

#### Scenario: Database connection initialization in Serverless environment
- **WHEN** the application processes a database query
- **THEN** it SHALL initialize or reuse a single connection client using Drizzle to execute the query without spawning excessive connections.

### Requirement: Core Schema Definition
The database schema SHALL define tables for `users`, `magic_links`, `sessions`, `subscriptions`, and `conversions` using Drizzle ORM. All schema declarations MUST reside in `db/schema/` and be typed strictly.

#### Scenario: User registration table fields
- **WHEN** a query inspects the database schema for the `users` table
- **THEN** it SHALL verify fields for `id`, `telegram_id` (unique, 64-bit bigint), `telegram_username` (nullable), `email` (unique, nullable), `website_url` (nullable), `api_key_hash` (unique), `crm_url` (nullable), `crm_login` (nullable), `crm_password` (encrypted, nullable), `telephony_url` (nullable), `telephony_login` (nullable), `telephony_password` (encrypted, nullable), `telephony_api_key` (encrypted, nullable), `created_at`, and `updated_at`.

#### Scenario: Magic Link token table fields
- **WHEN** a query inspects the database schema for the `magic_links` table
- **THEN** it SHALL verify fields for `id`, `user_id` (foreign key to `users.id`), `token` (unique token identifier), `expires_at`, `is_used` (boolean, default false), and `created_at`.

#### Scenario: Session table fields
- **WHEN** a query inspects the database schema for the `sessions` table
- **THEN** it SHALL verify fields for `id`, `user_id` (foreign key to `users.id`), `token` (unique session identifier), `expires_at`, and `created_at`.

#### Scenario: Subscriptions table fields
- **WHEN** a query inspects the database schema for the `subscriptions` table
- **THEN** it SHALL verify fields for `id`, `user_id` (foreign key to `users.id`), `tariff_plan` (enum: 'monthly', 'yearly'), `status` (enum: 'active', 'paused', 'suspended', 'cancelled'), `wallet_id` (nullable), `card_token` (nullable), `last_invoice_id` (nullable), `failed_attempts_count` (integer, default 0), `last_failed_attempt_at` (nullable timestamp), `current_period_end`, `created_at`, and `updated_at`.

#### Scenario: Conversions table fields and indexes
- **WHEN** a query inspects the database schema for the `conversions` table
- **THEN** it SHALL verify fields for `id`, `user_id` (foreign key to `users.id`), `date`, `conversion_time` (timestamp), `conversion_name`, `is_ad_conversion` (boolean), `email` (nullable), `phone` (nullable), `conversion_value` (numeric), `order_id` (nullable), `ip_address` (nullable), `ad_source` (nullable), `channel` (nullable), and `created_at`.
- **AND** it SHALL verify that composite index exists on `(user_id, conversion_time)` for optimized analytics queries.
- **AND** it SHALL verify that index exists on `created_at` (or `conversion_time`) for retention-based cleanup queries.

### Requirement: AES-256-GCM Encryption for Sensitive Credentials
The system SHALL encrypt sensitive user configuration fields (specifically `crm_password`, `telephony_password`, and `telephony_api_key`) before persisting them to the database. The encryption algorithm MUST be AES-256-GCM.

#### Scenario: Encryption of user CRM credentials
- **WHEN** a user saves or updates their CRM password
- **THEN** the system SHALL encrypt the CRM password using a key defined in the `ENCRYPTION_KEY` environment variable, generating an initialization vector (IV) and authentication tag, and store the combined output in the `crm_password` field.

### Requirement: AES-256-GCM Decryption for Integration Runs
The system SHALL decrypt previously encrypted CRM/telephony credentials using the corresponding key and metadata (IV and tag) when retrieving them from the database to run API sync processes.

#### Scenario: Decryption of telephony API token
- **WHEN** an integration sync task fetches a user's telephony API token from the database
- **THEN** the system SHALL decrypt the value using the `ENCRYPTION_KEY` and pass the raw API token to the HTTP client for request authentication.
