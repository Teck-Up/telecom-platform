require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const MIGRATIONS = [
  {
    name: '001_client_profile',
    statements: [
      `ALTER TABLE clients ADD COLUMN ice VARCHAR(50) NULL AFTER siret`,
      `ALTER TABLE clients ADD COLUMN account_manager_id INT NULL AFTER user_id`,
      `ALTER TABLE clients ADD CONSTRAINT fk_clients_account_manager FOREIGN KEY (account_manager_id) REFERENCES users(id) ON DELETE SET NULL`,
      `ALTER TABLE recovery_cases ADD COLUMN penalty_amount DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER overdue_amount`,
    ],
  },
  {
    name: '002_detail_pages',
    statements: [
      `ALTER TABLE payments ADD COLUMN status ENUM('success', 'pending', 'failed') NOT NULL DEFAULT 'success' AFTER recorded_by`,
      `CREATE TABLE IF NOT EXISTS recovery_interactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recovery_case_id INT NOT NULL,
        interaction_type ENUM('phone', 'email', 'note', 'legal_notice') NOT NULL,
        content TEXT NOT NULL,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recovery_case_id) REFERENCES recovery_cases(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )`,
    ],
  },
  {
    name: '003_payment_banking_metadata',
    statements: [
      `ALTER TABLE payments ADD COLUMN bank_name VARCHAR(100) NULL`,
      `ALTER TABLE payments ADD COLUMN bank_agency VARCHAR(255) NULL`,
      `ALTER TABLE payments ADD COLUMN issuer_name VARCHAR(255) NULL`,
      `ALTER TABLE payments ADD COLUMN account_rib VARCHAR(30) NULL`,
      `ALTER TABLE payments ADD COLUMN maturity_date DATE NULL`,
    ],
  },
];

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].n > 0;
}

async function tableExists(conn, name) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [name]
  );
  return rows[0].n > 0;
}

async function constraintExists(conn, name) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ?`,
    [name]
  );
  return rows[0].n > 0;
};

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'telecom_platform',
    multipleStatements: true,
  });

  try {
    for (const migration of MIGRATIONS) {
      console.log(`Running ${migration.name}...`);
      for (const sql of migration.statements) {
        try {
          if (sql.includes('ADD COLUMN ice') && await columnExists(conn, 'clients', 'ice')) continue;
          if (sql.includes('ADD COLUMN account_manager_id') && await columnExists(conn, 'clients', 'account_manager_id')) continue;
          if (sql.includes('penalty_amount') && await columnExists(conn, 'recovery_cases', 'penalty_amount')) continue;
          if (sql.includes('fk_clients_account_manager') && await constraintExists(conn, 'fk_clients_account_manager')) continue;
          if (sql.includes('payments ADD COLUMN status') && await columnExists(conn, 'payments', 'status')) continue;
          if (sql.includes('recovery_interactions') && await tableExists(conn, 'recovery_interactions')) continue;
          if (sql.includes('bank_name') && await columnExists(conn, 'payments', 'bank_name')) continue;
          if (sql.includes('bank_agency') && await columnExists(conn, 'payments', 'bank_agency')) continue;
          if (sql.includes('issuer_name') && await columnExists(conn, 'payments', 'issuer_name')) continue;
          if (sql.includes('account_rib') && await columnExists(conn, 'payments', 'account_rib')) continue;
          if (sql.includes('maturity_date') && await columnExists(conn, 'payments', 'maturity_date')) continue;
          await conn.query(sql);
          console.log(`  OK: ${sql.slice(0, 60)}...`);
        } catch (err) {
          if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') continue;
          throw err;
        }
      }
    }
    console.log('✅ Migrations complete');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
