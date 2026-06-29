-- Client profile enhancements
USE telecom_platform;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS ice VARCHAR(50) NULL AFTER siret,
  ADD COLUMN IF NOT EXISTS account_manager_id INT NULL AFTER user_id;

-- MySQL 8.0 may not support IF NOT EXISTS on ADD COLUMN — migration script handles duplicates

ALTER TABLE recovery_cases
  ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER overdue_amount;
