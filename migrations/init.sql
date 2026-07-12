-- Initialize expense_tracker database schema

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'UAH' CHECK (currency = 'UAH'),
    category VARCHAR(50) NOT NULL CHECK (category IN ('Продукти', 'Транспорт', 'Кафе/Ресторани', 'Комуналки', 'Розваги', 'Здоров''я', 'Покупки', 'Інше')),
    description TEXT NOT NULL,
    datetime TIMESTAMP NOT NULL,
    confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    validation_errors TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on datetime for faster report queries
CREATE INDEX IF NOT EXISTS idx_expenses_datetime ON expenses(datetime);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Create index on created_at for timeline queries
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);

-- Table to track validation failures for analysis
CREATE TABLE IF NOT EXISTS validation_logs (
    id SERIAL PRIMARY KEY,
    user_input TEXT NOT NULL,
    error_message TEXT NOT NULL,
    attempt_number INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Retention policy: delete validation_logs older than 30 days
-- (Run this periodically via a cron job or scheduled task)
-- DELETE FROM validation_logs WHERE created_at < NOW() - INTERVAL '30 days';

-- Access Control:
-- Restrict validation_logs table access to audit logs only.
-- In production, use role-based access control:
-- REVOKE ALL ON validation_logs FROM public;
-- GRANT SELECT ON validation_logs TO audit_role;
