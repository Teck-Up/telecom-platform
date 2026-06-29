require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize } = require('../src/models');

async function main() {
  const [rows] = await sequelize.query(
    "SELECT id FROM invoices WHERE description LIKE '%[DEMO]%'"
  );
  const ids = rows.map((r) => r.id);
  if (!ids.length) {
    console.log('No demo invoices to remove.');
    return;
  }
  const idList = ids.join(',');
  await sequelize.query(`DELETE FROM recovery_cases WHERE invoice_id IN (${idList})`);
  await sequelize.query(`DELETE FROM payments WHERE invoice_id IN (${idList})`);
  await sequelize.query(`DELETE FROM invoice_items WHERE invoice_id IN (${idList})`);
  await sequelize.query(`DELETE FROM invoices WHERE id IN (${idList})`);
  console.log(`✅ Removed ${ids.length} demo invoices and related data`);
}

main()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => sequelize.close());
