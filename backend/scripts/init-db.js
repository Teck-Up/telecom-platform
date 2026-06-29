require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  };

  const sqlPath = path.join(__dirname, '..', '..', 'database', 'init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const conn = await mysql.createConnection(config);
  try {
    await conn.query(sql);
    console.log('✅ Database initialized: telecom_platform');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('❌ Database init failed:', err.message);
  process.exit(1);
});
