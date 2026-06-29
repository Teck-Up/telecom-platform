-- Telecom Platform Database Schema

CREATE DATABASE IF NOT EXISTS telecom_platform;
USE telecom_platform;

-- Users table (all roles)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'billing_agent', 'recovery_agent', 'client') NOT NULL DEFAULT 'client',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  account_manager_id INT,
  company_name VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'France',
  siret VARCHAR(50),
  ice VARCHAR(50),
  contract_type ENUM('prepaid', 'postpaid', 'enterprise') DEFAULT 'postpaid',
  credit_limit DECIMAL(15,2) DEFAULT 0,
  status ENUM('active', 'suspended', 'terminated') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (account_manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Invoices table
CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  client_id INT NOT NULL,
  billing_agent_id INT,
  amount_ht DECIMAL(15,2) NOT NULL,
  tva_rate DECIMAL(5,2) DEFAULT 20.00,
  amount_ttc DECIMAL(15,2) NOT NULL,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  due_date DATE NOT NULL,
  issue_date DATE NOT NULL,
  status ENUM('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
  description TEXT,
  pdf_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (billing_agent_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Invoice line items
CREATE TABLE invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  total DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Payments table
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  client_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_date TIMESTAMP NOT NULL,
  payment_method ENUM('bank_transfer', 'credit_card', 'check', 'cash', 'direct_debit') NOT NULL,
  reference VARCHAR(255),
  notes TEXT,
  recorded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Recovery cases table
CREATE TABLE recovery_cases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  invoice_id INT NOT NULL,
  recovery_agent_id INT,
  status ENUM('open', 'in_progress', 'resolved', 'legal', 'closed') DEFAULT 'open',
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  overdue_amount DECIMAL(15,2) NOT NULL,
  penalty_amount DECIMAL(15,2) DEFAULT 0,
  overdue_days INT DEFAULT 0,
  notes TEXT,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (recovery_agent_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Reminders table
CREATE TABLE reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recovery_case_id INT NOT NULL,
  invoice_id INT NOT NULL,
  client_id INT NOT NULL,
  type ENUM('email', 'sms', 'phone', 'legal_notice') NOT NULL,
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  sent_at TIMESTAMP NULL,
  response TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recovery_case_id) REFERENCES recovery_cases(id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Notifications table
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  related_entity_type VARCHAR(50),
  related_entity_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── USERS ───────────────────────────────────────────────────────────────────
-- All passwords: Admin@123
INSERT INTO users (name, email, password, role) VALUES
('Administrateur',      'admin@telecom.fr',             '$2b$10$DzP8kTaHSihh6FgUhEORc.zE9wRa3pJ7bF07DSpQ6czBhM/fWcM9u', 'admin'),
('Sophie Bernard',      'facturation@telecom.fr',       '$2b$10$DzP8kTaHSihh6FgUhEORc.zE9wRa3pJ7bF07DSpQ6czBhM/fWcM9u', 'billing_agent'),
('Karim Laouiti',       'recouvrement@telecom.fr',      '$2b$10$DzP8kTaHSihh6FgUhEORc.zE9wRa3pJ7bF07DSpQ6czBhM/fWcM9u', 'recovery_agent'),
('Jean Dupont',         'jean.dupont@example.com',      '$2b$10$DzP8kTaHSihh6FgUhEORc.zE9wRa3pJ7bF07DSpQ6czBhM/fWcM9u', 'client'),
('Marie Martin',        'marie.martin@example.com',     '$2b$10$DzP8kTaHSihh6FgUhEORc.zE9wRa3pJ7bF07DSpQ6czBhM/fWcM9u', 'client'),
('Ahmed Benali',        'ahmed.benali@example.com',     '$2b$10$DzP8kTaHSihh6FgUhEORc.zE9wRa3pJ7bF07DSpQ6czBhM/fWcM9u', 'client'),
('Lucie Fontaine',      'lucie.fontaine@example.com',   '$2b$10$DzP8kTaHSihh6FgUhEORc.zE9wRa3pJ7bF07DSpQ6czBhM/fWcM9u', 'client'),
('Pierre Moreau',       'pierre.moreau@example.com',    '$2b$10$DzP8kTaHSihh6FgUhEORc.zE9wRa3pJ7bF07DSpQ6czBhM/fWcM9u', 'client'),
('Isabelle Chevalier',  'isabelle.chev@example.com',    '$2b$10$DzP8kTaHSihh6FgUhEORc.zE9wRa3pJ7bF07DSpQ6czBhM/fWcM9u', 'client'),
('Omar Tazi',           'omar.tazi@example.com',        '$2b$10$DzP8kTaHSihh6FgUhEORc.zE9wRa3pJ7bF07DSpQ6czBhM/fWcM9u', 'client'),
('Nathalie Girard',     'nathalie.girard@example.com',  '$2b$10$DzP8kTaHSihh6FgUhEORc.zE9wRa3pJ7bF07DSpQ6czBhM/fWcM9u', 'client'),
('Thomas Leroy',        'thomas.leroy@example.com',     '$2b$10$DzP8kTaHSihh6FgUhEORc.zE9wRa3pJ7bF07DSpQ6czBhM/fWcM9u', 'client'),
('Clara Petit',         'clara.petit@example.com',      '$2b$10$DzP8kTaHSihh6FgUhEORc.zE9wRa3pJ7bF07DSpQ6czBhM/fWcM9u', 'client');
