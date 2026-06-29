require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const TABLES = [
  'reminders',
  'notifications',
  'recovery_cases',
  'payments',
  'invoice_items',
  'invoices',
  'clients',
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'telecom_platform',
  });

  try {
    for (const table of TABLES) {
      const [result] = await conn.query(`DELETE FROM ${table}`);
      console.log(`  deleted ${result.affectedRows} rows from ${table}`);
    }
    console.log('✅ Demo data removed (users kept)');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('❌ Cleanup failed:', err.message);
  process.exit(1);
});
