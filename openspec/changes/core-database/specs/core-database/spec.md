## ADDED Requirements

### Requirement: Database Connection and Drizzle ORM Setup
The system SHALL use Drizzle ORM to establish and manage connections to the PostgreSQL database (Neon or Supabase). The connection manager SHALL handle Serverless environments by reusing connections and preventing connection exhaustion under concurrent requests.

#### Scenario: Database connection initialization in Serverless environment
- **WHEN** the application processes a database query
- **THEN** it SHALL initialize or reuse a single connection client using Drizzle to execute the query without spawning excessive connections.

### Requirement: Core Schema Definition
The database schema SHALL define tables for `users`, `sessions`, `subscriptions`, and `conversions` using Drizzle ORM. All schema declarations MUST reside in `db/schema/` and be typed strictly.

#### Scenario: User registration table fields
- **WHEN** a query inspects the database schema for the `users` table
- **THEN** it SHALL verify fields for `id`, `telegram_id` (unique), `telegram_username`, `email` (nullable), `website_url` (nullable), `crm_url`, `crm_login`, `crm_password` (encrypted), `telephony_url`, `telephony_login`, `telephony_password` (encrypted), `telephony_api_key` (encrypted), `created_at`, and `updated_at`.

#### Scenario: Session and Magic Link token table fields
- **WHEN** a query inspects the database schema for the `sessions` table
- **THEN** it SHALL verify fields for `id`, `user_id` (foreign key to `users.id`), `token` (unique session identifier or magic link token), `expires_at`, and `created_at`.

#### Scenario: Subscriptions table fields
- **WHEN** a query inspects the database schema for the `subscriptions` table
- **THEN** it SHALL verify fields for `id`, `user_id` (foreign key to `users.id`), `tariff_plan` (enum: 'monthly', 'yearly'), `status` (enum: 'active', 'paused', 'suspended', 'cancelled'), `wallet_id` (nullable), `card_token` (nullable), `current_period_end`, `created_at`, and `updated_at`.

#### Scenario: Conversions table fields
- **WHEN** a query inspects the database schema for the `conversions` table
- **THEN** it SHALL verify fields for `id`, `user_id` (foreign key to `users.id`), `date`, `conversion_time` (timestamp), `conversion_name`, `is_ad_conversion` (boolean), `email` (nullable), `phone` (nullable), `conversion_value` (numeric), `order_id` (nullable), `ip_address` (nullable), `ad_source` (nullable), `channel` (nullable), and `created_at`.

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
