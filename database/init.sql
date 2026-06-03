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
  company_name VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'France',
  siret VARCHAR(50),
  contract_type ENUM('prepaid', 'postpaid', 'enterprise') DEFAULT 'postpaid',
  credit_limit DECIMAL(15,2) DEFAULT 0,
  status ENUM('active', 'suspended', 'terminated') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
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

-- ─── CLIENTS ──────────────────────────────────────────────────────────────────
INSERT INTO clients (user_id, company_name, phone, address, city, postal_code, contract_type, credit_limit, status) VALUES
(4,  'Dupont SARL',          '0612345678', '12 Rue de la Paix',            'Paris',      '75001', 'enterprise', 50000,  'active'),
(5,  'Martin & Co',          '0698765432', '45 Avenue de la République',   'Lyon',       '69001', 'postpaid',   20000,  'active'),
(6,  'Benali Télécom',       '0623456789', '8 Boulevard Haussmann',        'Paris',      '75009', 'enterprise', 80000,  'active'),
(7,  'Fontaine Digital',     '0634567890', '22 Rue du Commerce',           'Bordeaux',   '33000', 'postpaid',   15000,  'active'),
(8,  'Moreau Industries',    '0645678901', '5 Avenue Jean Jaurès',         'Toulouse',   '31000', 'enterprise', 100000, 'active'),
(9,  'Chevalier & Associés', '0656789012', '17 Rue Saint-Michel',          'Marseille',  '13001', 'postpaid',   25000,  'suspended'),
(10, 'Tazi Group',           '0667890123', '33 Cours de la Libération',    'Bordeaux',   '33000', 'enterprise', 60000,  'active'),
(11, 'Girard Consulting',    '0678901234', '9 Place Bellecour',            'Lyon',       '69002', 'postpaid',   18000,  'active'),
(12, 'Leroy Teleservices',   '0689012345', '14 Rue de Rivoli',             'Paris',      '75004', 'prepaid',    5000,   'active'),
(13, 'Petit Innovations',    '0690123456', '3 Allée des Roses',            'Nantes',     '44000', 'postpaid',   12000,  'active');

-- ─── INVOICES ─────────────────────────────────────────────────────────────────
INSERT INTO invoices (invoice_number, client_id, billing_agent_id, amount_ht, tva_rate, amount_ttc, amount_paid, due_date, issue_date, status, description) VALUES
-- Client 1 - Dupont SARL (enterprise, mix paid/overdue)
('INV-2025-001', 1, 2, 4200.00,  20, 5040.00,  5040.00, '2025-02-28', '2025-02-01', 'paid',           'Abonnement fibre entreprise + téléphonie Feb 2025'),
('INV-2025-002', 1, 2, 4200.00,  20, 5040.00,  5040.00, '2025-03-31', '2025-03-01', 'paid',           'Abonnement fibre entreprise + téléphonie Mar 2025'),
('INV-2025-003', 1, 2, 4200.00,  20, 5040.00,  5040.00, '2025-04-30', '2025-04-01', 'paid',           'Abonnement fibre entreprise + téléphonie Avr 2025'),
('INV-2025-004', 1, 2, 4200.00,  20, 5040.00,  5040.00, '2025-05-31', '2025-05-01', 'paid',           'Abonnement fibre entreprise + téléphonie Mai 2025'),
('INV-2025-005', 1, 2, 4200.00,  20, 5040.00,  5040.00, '2025-06-30', '2025-06-01', 'paid',           'Abonnement fibre entreprise + téléphonie Jun 2025'),
('INV-2025-006', 1, 2, 4850.00,  20, 5820.00,  5820.00, '2025-07-31', '2025-07-01', 'paid',           'Abonnement + dépassement data Jul 2025'),
('INV-2025-007', 1, 2, 4200.00,  20, 5040.00,  5040.00, '2025-08-31', '2025-08-01', 'paid',           'Abonnement fibre entreprise Aug 2025'),
('INV-2025-008', 1, 2, 4200.00,  20, 5040.00,  5040.00, '2025-09-30', '2025-09-01', 'paid',           'Abonnement fibre entreprise Sep 2025'),
('INV-2025-009', 1, 2, 4200.00,  20, 5040.00,  5040.00, '2025-10-31', '2025-10-01', 'paid',           'Abonnement fibre entreprise Oct 2025'),
('INV-2025-010', 1, 2, 4200.00,  20, 5040.00,  2000.00, '2025-11-30', '2025-11-01', 'partially_paid', 'Abonnement fibre entreprise Nov 2025'),
('INV-2025-011', 1, 2, 4200.00,  20, 5040.00,  0.00,    '2025-12-31', '2025-12-01', 'overdue',        'Abonnement fibre entreprise Dec 2025'),
('INV-2026-001', 1, 2, 4200.00,  20, 5040.00,  0.00,    '2026-01-31', '2026-01-01', 'overdue',        'Abonnement fibre entreprise Jan 2026'),
('INV-2026-002', 1, 2, 4200.00,  20, 5040.00,  0.00,    '2026-02-28', '2026-02-01', 'overdue',        'Abonnement fibre entreprise Fev 2026'),
-- Client 2 - Martin & Co
('INV-2025-012', 2, 2, 1200.00,  20, 1440.00,  1440.00, '2025-06-30', '2025-06-01', 'paid',           'Forfait mobile 5 lignes Jun 2025'),
('INV-2025-013', 2, 2, 1200.00,  20, 1440.00,  1440.00, '2025-07-31', '2025-07-01', 'paid',           'Forfait mobile 5 lignes Jul 2025'),
('INV-2025-014', 2, 2, 1200.00,  20, 1440.00,  1440.00, '2025-08-31', '2025-08-01', 'paid',           'Forfait mobile 5 lignes Aug 2025'),
('INV-2025-015', 2, 2, 1200.00,  20, 1440.00,  0.00,    '2025-09-30', '2025-09-01', 'overdue',        'Forfait mobile 5 lignes Sep 2025'),
('INV-2025-016', 2, 2, 1200.00,  20, 1440.00,  0.00,    '2025-10-31', '2025-10-01', 'overdue',        'Forfait mobile 5 lignes Oct 2025'),
-- Client 3 - Benali Télécom
('INV-2025-017', 3, 2, 8500.00,  20, 10200.00, 10200.00,'2025-04-30', '2025-04-01', 'paid',           'Solution VoIP entreprise + datacenter Avr 2025'),
('INV-2025-018', 3, 2, 8500.00,  20, 10200.00, 10200.00,'2025-05-31', '2025-05-01', 'paid',           'Solution VoIP entreprise + datacenter Mai 2025'),
('INV-2025-019', 3, 2, 8500.00,  20, 10200.00, 10200.00,'2025-06-30', '2025-06-01', 'paid',           'Solution VoIP entreprise + datacenter Jun 2025'),
('INV-2025-020', 3, 2, 9200.00,  20, 11040.00, 11040.00,'2025-07-31', '2025-07-01', 'paid',           'VoIP + extension 10 postes Jul 2025'),
('INV-2025-021', 3, 2, 8500.00,  20, 10200.00, 10200.00,'2025-08-31', '2025-08-01', 'paid',           'Solution VoIP entreprise Aug 2025'),
('INV-2025-022', 3, 2, 8500.00,  20, 10200.00, 10200.00,'2025-09-30', '2025-09-01', 'paid',           'Solution VoIP entreprise Sep 2025'),
('INV-2025-023', 3, 2, 8500.00,  20, 10200.00, 5000.00, '2025-10-31', '2025-10-01', 'partially_paid', 'Solution VoIP entreprise Oct 2025'),
('INV-2025-024', 3, 2, 8500.00,  20, 10200.00, 0.00,    '2025-11-30', '2025-11-01', 'overdue',        'Solution VoIP entreprise Nov 2025'),
('INV-2025-025', 3, 2, 8500.00,  20, 10200.00, 0.00,    '2025-12-31', '2025-12-01', 'overdue',        'Solution VoIP entreprise Dec 2025'),
-- Client 4 - Fontaine Digital
('INV-2025-026', 4, 2, 950.00,   20, 1140.00,  1140.00, '2025-09-30', '2025-09-01', 'paid',           'Forfait internet + cloud Sep 2025'),
('INV-2025-027', 4, 2, 950.00,   20, 1140.00,  1140.00, '2025-10-31', '2025-10-01', 'paid',           'Forfait internet + cloud Oct 2025'),
('INV-2025-028', 4, 2, 950.00,   20, 1140.00,  0.00,    '2025-11-30', '2025-11-01', 'overdue',        'Forfait internet + cloud Nov 2025'),
('INV-2025-029', 4, 2, 950.00,   20, 1140.00,  0.00,    '2025-12-31', '2025-12-01', 'overdue',        'Forfait internet + cloud Dec 2025'),
-- Client 5 - Moreau Industries
('INV-2025-030', 5, 2, 12000.00, 20, 14400.00, 14400.00,'2025-03-31', '2025-03-01', 'paid',           'Infrastructure réseau complète Mar 2025'),
('INV-2025-031', 5, 2, 12000.00, 20, 14400.00, 14400.00,'2025-04-30', '2025-04-01', 'paid',           'Infrastructure réseau complète Avr 2025'),
('INV-2025-032', 5, 2, 12000.00, 20, 14400.00, 14400.00,'2025-05-31', '2025-05-01', 'paid',           'Infrastructure réseau complète Mai 2025'),
('INV-2025-033', 5, 2, 12000.00, 20, 14400.00, 14400.00,'2025-06-30', '2025-06-01', 'paid',           'Infrastructure réseau complète Jun 2025'),
('INV-2025-034', 5, 2, 12000.00, 20, 14400.00, 14400.00,'2025-07-31', '2025-07-01', 'paid',           'Infrastructure réseau complète Jul 2025'),
('INV-2025-035', 5, 2, 13500.00, 20, 16200.00, 16200.00,'2025-08-31', '2025-08-01', 'paid',           'Infrastructure + mise à niveau équipements Aug 2025'),
('INV-2025-036', 5, 2, 12000.00, 20, 14400.00, 14400.00,'2025-09-30', '2025-09-01', 'paid',           'Infrastructure réseau Sep 2025'),
('INV-2025-037', 5, 2, 12000.00, 20, 14400.00, 14400.00,'2025-10-31', '2025-10-01', 'paid',           'Infrastructure réseau Oct 2025'),
('INV-2025-038', 5, 2, 12000.00, 20, 14400.00, 14400.00,'2025-11-30', '2025-11-01', 'paid',           'Infrastructure réseau Nov 2025'),
('INV-2025-039', 5, 2, 12000.00, 20, 14400.00, 14400.00,'2025-12-31', '2025-12-01', 'paid',           'Infrastructure réseau Dec 2025'),
('INV-2026-003', 5, 2, 12000.00, 20, 14400.00, 14400.00,'2026-01-31', '2026-01-01', 'paid',           'Infrastructure réseau Jan 2026'),
('INV-2026-004', 5, 2, 12000.00, 20, 14400.00, 0.00,    '2026-02-28', '2026-02-01', 'sent',           'Infrastructure réseau Fev 2026'),
-- Client 6 - Chevalier & Associés (suspended)
('INV-2025-040', 6, 2, 2100.00,  20, 2520.00,  0.00,    '2025-08-31', '2025-08-01', 'overdue',        'Abonnement pro suspendu Aug 2025'),
('INV-2025-041', 6, 2, 2100.00,  20, 2520.00,  0.00,    '2025-09-30', '2025-09-01', 'overdue',        'Abonnement pro suspendu Sep 2025'),
('INV-2025-042', 6, 2, 2100.00,  20, 2520.00,  0.00,    '2025-10-31', '2025-10-01', 'overdue',        'Abonnement pro suspendu Oct 2025'),
-- Client 7 - Tazi Group
('INV-2025-043', 7, 2, 6800.00,  20, 8160.00,  8160.00, '2025-07-31', '2025-07-01', 'paid',           'Réseau privé virtuel + sécurité Jul 2025'),
('INV-2025-044', 7, 2, 6800.00,  20, 8160.00,  8160.00, '2025-08-31', '2025-08-01', 'paid',           'Réseau privé virtuel + sécurité Aug 2025'),
('INV-2025-045', 7, 2, 6800.00,  20, 8160.00,  8160.00, '2025-09-30', '2025-09-01', 'paid',           'Réseau privé virtuel + sécurité Sep 2025'),
('INV-2025-046', 7, 2, 6800.00,  20, 8160.00,  8160.00, '2025-10-31', '2025-10-01', 'paid',           'Réseau privé virtuel + sécurité Oct 2025'),
('INV-2025-047', 7, 2, 6800.00,  20, 8160.00,  4000.00, '2025-11-30', '2025-11-01', 'partially_paid', 'Réseau privé virtuel + sécurité Nov 2025'),
('INV-2025-048', 7, 2, 6800.00,  20, 8160.00,  0.00,    '2025-12-31', '2025-12-01', 'overdue',        'Réseau privé virtuel + sécurité Dec 2025'),
-- Client 8 - Girard Consulting
('INV-2025-049', 8, 2, 1800.00,  20, 2160.00,  2160.00, '2025-10-31', '2025-10-01', 'paid',           'Forfait cloud + sauvegarde Oct 2025'),
('INV-2025-050', 8, 2, 1800.00,  20, 2160.00,  2160.00, '2025-11-30', '2025-11-01', 'paid',           'Forfait cloud + sauvegarde Nov 2025'),
('INV-2026-005', 8, 2, 1800.00,  20, 2160.00,  0.00,    '2026-01-31', '2026-01-01', 'sent',           'Forfait cloud + sauvegarde Jan 2026'),
('INV-2026-006', 8, 2, 1800.00,  20, 2160.00,  0.00,    '2026-02-28', '2026-02-01', 'draft',          'Forfait cloud + sauvegarde Fev 2026'),
-- Client 9 - Leroy Teleservices
('INV-2025-051', 9, 2, 450.00,   20, 540.00,   540.00,  '2025-11-30', '2025-11-01', 'paid',           'Forfait prépayé entreprise Nov 2025'),
('INV-2025-052', 9, 2, 450.00,   20, 540.00,   0.00,    '2025-12-31', '2025-12-01', 'overdue',        'Forfait prépayé entreprise Dec 2025'),
-- Client 10 - Petit Innovations
('INV-2026-007', 10, 2, 750.00,  20, 900.00,   900.00,  '2026-01-31', '2026-01-01', 'paid',           'Abonnement startup Jan 2026'),
('INV-2026-008', 10, 2, 750.00,  20, 900.00,   0.00,    '2026-02-28', '2026-02-01', 'sent',           'Abonnement startup Fev 2026');

-- ─── INVOICE ITEMS ────────────────────────────────────────────────────────────
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total) VALUES
(1,  'Abonnement fibre 1 Gbps',     1, 2500.00, 2500.00),
(1,  'Téléphonie IP (10 postes)',    1, 1200.00, 1200.00),
(1,  'Support technique 24/7',       1, 500.00,  500.00),
(17, 'Solution VoIP (50 postes)',    1, 5000.00, 5000.00),
(17, 'Hébergement datacenter',       1, 2500.00, 2500.00),
(17, 'Maintenance mensuelle',        1, 1000.00, 1000.00),
(30, 'Infrastructure réseau LAN',   1, 7000.00, 7000.00),
(30, 'Connexion MPLS 10 Gbps',      1, 3000.00, 3000.00),
(30, 'Supervision réseau',           1, 2000.00, 2000.00),
(43, 'VPN site-à-site (3 sites)',    1, 4000.00, 4000.00),
(43, 'Firewall managé',              1, 1800.00, 1800.00),
(43, 'Monitoring sécurité',          1, 1000.00, 1000.00);

-- ─── PAYMENTS ─────────────────────────────────────────────────────────────────
INSERT INTO payments (invoice_id, client_id, amount, payment_date, payment_method, reference, recorded_by) VALUES
(1,  1, 5040.00, '2025-02-25 10:00:00', 'bank_transfer', 'VIR-2025-0201', 2),
(2,  1, 5040.00, '2025-03-28 09:30:00', 'bank_transfer', 'VIR-2025-0301', 2),
(3,  1, 5040.00, '2025-04-29 11:00:00', 'bank_transfer', 'VIR-2025-0401', 2),
(4,  1, 5040.00, '2025-05-30 10:15:00', 'bank_transfer', 'VIR-2025-0501', 2),
(5,  1, 5040.00, '2025-06-28 14:00:00', 'bank_transfer', 'VIR-2025-0601', 2),
(6,  1, 5820.00, '2025-07-29 10:00:00', 'bank_transfer', 'VIR-2025-0701', 2),
(7,  1, 5040.00, '2025-08-28 09:00:00', 'bank_transfer', 'VIR-2025-0801', 2),
(8,  1, 5040.00, '2025-09-26 10:30:00', 'bank_transfer', 'VIR-2025-0901', 2),
(9,  1, 5040.00, '2025-10-29 11:00:00', 'bank_transfer', 'VIR-2025-1001', 2),
(10, 1, 2000.00, '2025-11-15 09:00:00', 'bank_transfer', 'VIR-2025-1101', 2),
(14, 2, 1440.00, '2025-06-28 10:00:00', 'direct_debit',  'PRLV-2025-0601', 2),
(15, 2, 1440.00, '2025-07-30 10:00:00', 'direct_debit',  'PRLV-2025-0701', 2),
(16, 2, 1440.00, '2025-08-29 10:00:00', 'direct_debit',  'PRLV-2025-0801', 2),
(19, 3, 10200.00,'2025-04-28 14:00:00', 'bank_transfer', 'VIR-2025-0402', 2),
(20, 3, 10200.00,'2025-05-30 14:00:00', 'bank_transfer', 'VIR-2025-0502', 2),
(21, 3, 10200.00,'2025-06-27 14:00:00', 'bank_transfer', 'VIR-2025-0602', 2),
(22, 3, 11040.00,'2025-07-30 14:00:00', 'bank_transfer', 'VIR-2025-0702', 2),
(23, 3, 10200.00,'2025-08-29 14:00:00', 'bank_transfer', 'VIR-2025-0802', 2),
(24, 3, 10200.00,'2025-09-26 14:00:00', 'bank_transfer', 'VIR-2025-0902', 2),
(25, 3, 5000.00, '2025-10-20 14:00:00', 'bank_transfer', 'VIR-2025-1002', 2),
(27, 4, 1140.00, '2025-09-28 10:00:00', 'credit_card',   'CB-2025-0901', 2),
(28, 4, 1140.00, '2025-10-30 10:00:00', 'credit_card',   'CB-2025-1001', 2),
(31, 5, 14400.00,'2025-03-29 10:00:00', 'bank_transfer', 'VIR-2025-0301M', 2),
(32, 5, 14400.00,'2025-04-28 10:00:00', 'bank_transfer', 'VIR-2025-0401M', 2),
(33, 5, 14400.00,'2025-05-30 10:00:00', 'bank_transfer', 'VIR-2025-0501M', 2),
(34, 5, 14400.00,'2025-06-27 10:00:00', 'bank_transfer', 'VIR-2025-0601M', 2),
(35, 5, 14400.00,'2025-07-30 10:00:00', 'bank_transfer', 'VIR-2025-0701M', 2),
(36, 5, 16200.00,'2025-08-29 10:00:00', 'bank_transfer', 'VIR-2025-0801M', 2),
(37, 5, 14400.00,'2025-09-26 10:00:00', 'bank_transfer', 'VIR-2025-0901M', 2),
(38, 5, 14400.00,'2025-10-30 10:00:00', 'bank_transfer', 'VIR-2025-1001M', 2),
(39, 5, 14400.00,'2025-11-28 10:00:00', 'bank_transfer', 'VIR-2025-1101M', 2),
(40, 5, 14400.00,'2025-12-29 10:00:00', 'bank_transfer', 'VIR-2025-1201M', 2),
(41, 5, 14400.00,'2026-01-30 10:00:00', 'bank_transfer', 'VIR-2026-0101M', 2),
(44, 7, 8160.00, '2025-07-29 11:00:00', 'bank_transfer', 'VIR-2025-0701T', 2),
(45, 7, 8160.00, '2025-08-28 11:00:00', 'bank_transfer', 'VIR-2025-0801T', 2),
(46, 7, 8160.00, '2025-09-26 11:00:00', 'bank_transfer', 'VIR-2025-0901T', 2),
(47, 7, 8160.00, '2025-10-30 11:00:00', 'bank_transfer', 'VIR-2025-1001T', 2),
(48, 7, 4000.00, '2025-11-20 11:00:00', 'bank_transfer', 'VIR-2025-1101T', 2),
(50, 8, 2160.00, '2025-10-29 09:00:00', 'credit_card',   'CB-2025-1001G', 2),
(51, 8, 2160.00, '2025-11-28 09:00:00', 'credit_card',   'CB-2025-1101G', 2),
(52, 9, 540.00,  '2025-11-28 10:00:00', 'direct_debit',  'PRLV-2025-1101L', 2),
(54, 10, 900.00, '2026-01-29 10:00:00', 'bank_transfer', 'VIR-2026-0101P', 2);

-- ─── RECOVERY CASES ───────────────────────────────────────────────────────────
INSERT INTO recovery_cases (client_id, invoice_id, recovery_agent_id, status, priority, overdue_amount, overdue_days, notes) VALUES
(1, 11, 3, 'in_progress', 'high',     5040.00,  155, 'Client contacté par email le 15/01. Promesse de paiement pour fin janvier non tenue.'),
(1, 12, 3, 'in_progress', 'high',     5040.00,  125, 'Relance en cours. Client invoque des difficultés de trésorerie.'),
(1, 13, 3, 'open',        'critical', 5040.00,   93, 'Nouveau dossier ouvert. Total impayé Dupont: 15 120 €'),
(2, 17, 3, 'in_progress', 'medium',   1440.00,  245, 'Client difficile à joindre. SMS envoyé.'),
(2, 18, 3, 'in_progress', 'medium',   1440.00,  214, 'Relance email envoyée le 20/02.'),
(3, 26, 3, 'open',        'critical', 5200.00,  155, 'Benali Télécom: 20 400 € impayés sur 2 factures. Risque mise en demeure.'),
(3, 27, 3, 'open',        'critical', 10200.00, 125, 'Escalade juridique envisagée si non régularisation avant le 30/06.'),
(4, 29, 3, 'open',        'medium',   1140.00,  245, 'Fontaine Digital: 2 factures impayées.'),
(4, 30, 3, 'open',        'medium',   1140.00,  214, 'En attente de réponse client.'),
(6, 41, 3, 'legal',       'critical', 2520.00,  307, 'Chevalier: compte suspendu. 3 factures impayées. Dossier transmis au service juridique.'),
(6, 42, 3, 'legal',       'critical', 2520.00,  276, 'Procédure en cours.'),
(6, 43, 3, 'legal',       'critical', 2520.00,  245, 'Mise en demeure envoyée le 01/03/2026.'),
(7, 49, 3, 'in_progress', 'high',     4160.00,  155, 'Tazi Group: paiement partiel reçu en novembre. Solde restant non réglé.'),
(9, 53, 3, 'open',        'low',      540.00,   155, 'Leroy Teleservices: petite créance, relance simple suffisante.');

-- ─── REMINDERS ────────────────────────────────────────────────────────────────
INSERT INTO reminders (recovery_case_id, invoice_id, client_id, type, status, sent_at, response, created_by) VALUES
(1, 11, 1, 'email',        'sent', '2026-01-15 09:00:00', 'Pas de réponse', 3),
(1, 11, 1, 'phone',        'sent', '2026-01-22 14:00:00', 'Client promet de payer avant le 31/01', 3),
(1, 11, 1, 'email',        'sent', '2026-02-05 09:00:00', 'Pas de réponse', 3),
(2, 12, 1, 'email',        'sent', '2026-02-10 09:00:00', 'Pas de réponse', 3),
(4, 17, 2, 'sms',          'sent', '2026-01-10 10:00:00', 'Lu, pas de réponse', 3),
(4, 17, 2, 'email',        'sent', '2026-01-20 09:00:00', 'Pas de réponse', 3),
(6, 26, 3, 'email',        'sent', '2026-02-01 09:00:00', 'Réponse: difficultés financières temporaires', 3),
(10, 41, 6, 'legal_notice','sent', '2026-03-01 09:00:00', 'Mise en demeure envoyée par courrier recommandé', 3),
(13, 49, 7, 'email',       'sent', '2026-01-08 09:00:00', 'Pas de réponse', 3),
(13, 49, 7, 'phone',       'sent', '2026-01-15 11:00:00', 'Client demande délai jusqu au 28/02', 3);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
(4, 'Facture en retard',    'Votre facture INV-2025-011 d un montant de 5 040 € est en retard de paiement.', 'warning', FALSE),
(4, 'Relance de paiement',  'Une relance a été envoyée concernant votre facture INV-2025-011.', 'warning', FALSE),
(4, 'Facture en retard',    'Votre facture INV-2026-001 d un montant de 5 040 € est en retard de paiement.', 'warning', FALSE),
(5, 'Facture disponible',   'Votre facture INV-2025-015 est disponible. Montant: 1 440 €', 'info', TRUE),
(5, 'Facture en retard',    'Votre facture INV-2025-015 est en retard de paiement.', 'warning', FALSE),
(6, 'Facture en retard',    'Votre facture INV-2025-023 d un montant de 10 200 € est en retard.', 'warning', FALSE),
(6, 'Facture en retard',    'Votre facture INV-2025-024 d un montant de 10 200 € est en retard.', 'error', FALSE),
(9, 'Compte suspendu',      'Votre compte a été suspendu suite à des impayés. Contactez le support.', 'error', FALSE),
(9, 'Mise en demeure',      'Une mise en demeure a été émise. Régularisez votre situation sous 15 jours.', 'error', FALSE),
(1, 'Nouveau client',       'Le client Petit Innovations a été ajouté à la plateforme.', 'info', TRUE),
(2, 'Facture payée',        'La facture INV-2026-007 de Petit Innovations a été réglée.', 'success', TRUE),
(3, 'Nouveau dossier',      'Un nouveau dossier de recouvrement a été ouvert pour Dupont SARL.', 'info', FALSE);
