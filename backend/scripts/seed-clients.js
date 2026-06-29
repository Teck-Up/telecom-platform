require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const { User, Client, sequelize } = require('../src/models');

const DEFAULT_PASSWORD = 'Client@123';

const CLIENTS = [
  { name: 'Karim Ben Salah', company: 'Atlas Connect SARL', city: 'Tunis', phone: '+216 71 240 110', contract: 'enterprise', ice: '000123456789012' },
  { name: 'Leila Trabelsi', company: 'MedNet Solutions', city: 'Sfax', phone: '+216 74 320 880', contract: 'postpaid', ice: '000234567890123' },
  { name: 'Youssef Hammami', company: 'Sahel Telecom', city: 'Sousse', phone: '+216 73 210 450', contract: 'postpaid', ice: '000345678901234' },
  { name: 'Nadia Gharbi', company: 'Cap Bon Networks', city: 'Nabeul', phone: '+216 72 760 330', contract: 'prepaid', ice: '000456789012345' },
  { name: 'Hichem Bouazizi', company: 'Oasis Digital', city: 'Gabès', phone: '+216 75 280 120', contract: 'postpaid', ice: '000567890123456' },
  { name: 'Amira Jebali', company: 'Phoenix IT Services', city: 'Monastir', phone: '+216 73 460 770', contract: 'enterprise', ice: '000678901234567' },
  { name: 'Sami Khelifi', company: 'Horizon Fibre', city: 'Bizerte', phone: '+216 72 430 990', contract: 'postpaid', ice: '000789012345678' },
  { name: 'Rim Chaabane', company: 'StarLink Tunisie', city: 'Ariana', phone: '+216 71 850 220', contract: 'postpaid', ice: '000890123456789' },
  { name: 'Fares Mejri', company: 'DataStream Consulting', city: 'Tunis', phone: '+216 71 320 640', contract: 'enterprise', ice: '000901234567890' },
  { name: 'Salma Dridi', company: 'BlueWave Communications', city: 'Mahdia', phone: '+216 73 690 510', contract: 'prepaid', ice: '001012345678901' },
  { name: 'Omar Ferchichi', company: 'NourCom Group', city: 'Kairouan', phone: '+216 77 220 180', contract: 'postpaid', ice: '001123456789012' },
  { name: 'Ines Baccouche', company: 'SmartOffice Pro', city: 'Tunis', phone: '+216 71 560 900', contract: 'postpaid', ice: '001234567890123' },
  { name: 'Walid Sassi', company: 'Gulf Link Telecom', city: 'Sfax', phone: '+216 74 880 440', contract: 'enterprise', ice: '001345678901234' },
  { name: 'Hana Mansouri', company: 'Vertex Cloud TN', city: 'La Marsa', phone: '+216 71 780 350', contract: 'postpaid', ice: '001456789012345' },
  { name: 'Bilel Ayari', company: 'Pulse Mobile Distributeur', city: 'Gafsa', phone: '+216 76 310 270', contract: 'prepaid', ice: '001567890123456' },
  { name: 'Mariem Chebbi', company: 'EuroLink Tunisie', city: 'Tunis', phone: '+216 71 910 660', contract: 'enterprise', ice: '001678901234567' },
  { name: 'Anis Rekik', company: 'SudNet Services', city: 'Médenine', phone: '+216 75 640 880', contract: 'postpaid', ice: '001789012345678' },
  { name: 'Emna Ben Amor', company: 'Crystal VoIP', city: 'Ben Arous', phone: '+216 71 440 770', contract: 'postpaid', ice: '001890123456789' },
  { name: 'Tarek Oueslati', company: 'Maghreb Data Center', city: 'Tunis', phone: '+216 71 120 550', contract: 'enterprise', ice: '001901234567890' },
  { name: 'Sonia Belhadj', company: 'LinkUp Retail', city: 'Sousse', phone: '+216 73 880 190', contract: 'prepaid', ice: '002012345678901' },
];

async function main() {
  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const created = [];

  await sequelize.transaction(async (t) => {
    for (let i = 0; i < CLIENTS.length; i += 1) {
      const row = CLIENTS[i];
      const suffix = String(i + 1).padStart(2, '0');
      const email = `client.demo${suffix}@telecom-platform.local`;

      const existing = await User.findOne({ where: { email }, transaction: t });
      if (existing) {
        console.log(`  skip ${email} (already exists)`);
        continue;
      }

      const user = await User.create(
        { name: row.name, email, password: hashed, role: 'client' },
        { transaction: t }
      );

      const client = await Client.create(
        {
          user_id: user.id,
          company_name: row.company,
          phone: row.phone,
          address: `${10 + i} Avenue Habib Bourguiba`,
          city: row.city,
          postal_code: `${1000 + i}`,
          country: 'Tunisie',
          contract_type: row.contract,
          credit_limit: row.contract === 'enterprise' ? 50000 : row.contract === 'postpaid' ? 15000 : 5000,
          ice: row.ice,
          status: 'active',
        },
        { transaction: t }
      );

      created.push({ id: client.id, company: row.company, email });
    }
  });

  console.log(`✅ Created ${created.length} client(s)`);
  for (const c of created) {
    console.log(`   #${c.id} ${c.company} — ${c.email}`);
  }
  if (created.length) {
    console.log(`\nDefault password for all: ${DEFAULT_PASSWORD}`);
  }
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  })
  .finally(() => sequelize.close());
