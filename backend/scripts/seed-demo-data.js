require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const {
  Client, User, Invoice, InvoiceItem, Payment, RecoveryCase, sequelize,
} = require('../src/models');
const { Op } = require('sequelize');

const DEMO_CLIENT_IDS = Array.from({ length: 20 }, (_, i) => 12 + i);
const BILLING_AGENT_ID = 2;
const RECOVERY_AGENT_ID = 3;
const TVA_RATE = 19;
const MARKER = '[DEMO]';

const SERVICES = [
  { description: 'Abonnement fibre entreprise 1 Gbps', unit_price: 890 },
  { description: 'Forfait mobile pro (10 lignes)', unit_price: 450 },
  { description: 'Maintenance réseau mensuelle', unit_price: 320 },
  { description: 'Location routeur / firewall', unit_price: 180 },
  { description: 'Trunk SIP — 20 canaux', unit_price: 560 },
  { description: 'Hébergement cloud — forfait mensuel', unit_price: 720 },
];

const PAYMENT_METHODS = ['bank_transfer', 'check', 'direct_debit', 'credit_card', 'cash'];
const BANKS = ['UIB', 'STB', 'BIAT', 'Attijari bank', 'Amen Bank'];

const round2 = (n) => Math.round(n * 100) / 100;
const addDays = (base, days) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const addDaysDate = (base, days) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

const pickServices = (seed, count = 2) => {
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const svc = SERVICES[(seed + i) % SERVICES.length];
    const qty = 1 + ((seed + i) % 3);
    items.push({
      description: svc.description,
      quantity: qty,
      unit_price: svc.unit_price,
      total: round2(qty * svc.unit_price),
    });
  }
  return items;
};

const calcAmounts = (items) => {
  const amount_ht = round2(items.reduce((s, it) => s + it.total, 0));
  const amount_ttc = round2(amount_ht * (1 + TVA_RATE / 100));
  return { amount_ht, amount_ttc };
};

const invoiceNumber = (clientId, seq) =>
  `FA-2026-D${String(clientId).padStart(3, '0')}-${String(seq).padStart(2, '0')}`;

async function applyPayment(invoice, amount, opts, t) {
  const {
    payment_date,
    payment_method,
    reference,
    status = 'success',
    bank_name = null,
    bank_agency = null,
    issuer_name = null,
    account_rib = null,
    maturity_date = null,
    notes = null,
  } = opts;

  await Payment.create(
    {
      invoice_id: invoice.id,
      client_id: invoice.client_id,
      amount,
      payment_date,
      payment_method,
      reference,
      notes,
      recorded_by: BILLING_AGENT_ID,
      status,
      bank_name,
      bank_agency,
      issuer_name,
      account_rib,
      maturity_date,
    },
    { transaction: t }
  );

  if (status !== 'success') return invoice;

  const newPaid = round2(Number(invoice.amount_paid) + Number(amount));
  let newStatus = invoice.status;
  if (newPaid >= Number(invoice.amount_ttc)) newStatus = 'paid';
  else if (newPaid > 0) newStatus = 'partially_paid';

  await invoice.update({ amount_paid: newPaid, status: newStatus }, { transaction: t });
  invoice.amount_paid = newPaid;
  invoice.status = newStatus;
  return invoice;
}

async function createInvoice(clientId, spec, t) {
  const items = pickServices(spec.seed, spec.itemCount || 2);
  const { amount_ht, amount_ttc } = calcAmounts(items);

  const invoice = await Invoice.create(
    {
      invoice_number: invoiceNumber(clientId, spec.seq),
      client_id: clientId,
      billing_agent_id: BILLING_AGENT_ID,
      amount_ht,
      tva_rate: TVA_RATE,
      amount_ttc,
      amount_paid: 0,
      issue_date: spec.issue_date,
      due_date: spec.due_date,
      status: 'sent',
      description: `${MARKER} ${spec.label}`,
    },
    { transaction: t }
  );

  await Promise.all(
    items.map((item) =>
      InvoiceItem.create({ invoice_id: invoice.id, ...item }, { transaction: t })
    )
  );

  return invoice;
}

const RECOVERY_STATUSES = [
  'open', 'open', 'open', 'open', 'open', 'open',
  'in_progress', 'in_progress', 'in_progress', 'in_progress',
  'in_progress', 'in_progress',
  'legal', 'legal',
  'resolved', 'resolved',
  'closed', 'closed',
  'open', 'in_progress',
];

const RECOVERY_PRIORITIES = [
  'medium', 'high', 'critical', 'low', 'high', 'medium',
  'high', 'critical', 'medium', 'low', 'high', 'critical',
  'critical', 'high', 'medium', 'low', 'medium', 'low',
  'high', 'medium',
];

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const clients = await Client.findAll({
    where: { id: { [Op.in]: DEMO_CLIENT_IDS } },
    include: [{ model: User, as: 'user', attributes: ['name'] }],
    order: [['id', 'ASC']],
  });

  if (clients.length === 0) {
    console.log('❌ No demo clients found (ids 12–31). Run seed-clients.js first.');
    process.exit(1);
  }

  const existing = await Invoice.count({
    where: { client_id: { [Op.in]: DEMO_CLIENT_IDS }, description: { [Op.like]: `%${MARKER}%` } },
  });
  if (existing > 0) {
    console.log(`⚠️  Demo data already exists (${existing} invoices). Skipping.`);
    console.log('   Delete invoices with [DEMO] in description to re-seed.');
    process.exit(0);
  }

  let invoiceTotal = 0;
  let paymentTotal = 0;
  let recoveryTotal = 0;
  const recoveryInvoices = [];

  await sequelize.transaction(async (t) => {
    for (let i = 0; i < clients.length; i += 1) {
      const client = clients[i];
      const clientId = client.id;
      const issuer = client.user?.name || client.company_name;
      const methodA = PAYMENT_METHODS[i % PAYMENT_METHODS.length];
      const methodB = PAYMENT_METHODS[(i + 2) % PAYMENT_METHODS.length];

      const inv1 = await createInvoice(clientId, {
        seq: 1,
        seed: clientId * 3,
        label: 'Facture historique — services telecom',
        issue_date: addDays(today, -120 - i * 3),
        due_date: addDays(today, -90 - i * 3),
      }, t);
      invoiceTotal += 1;

      const full1 = Number(inv1.amount_ttc);
      await applyPayment(inv1, full1, {
        payment_date: addDaysDate(today, -85 - i * 3),
        payment_method: methodA,
        reference: methodA === 'check'
          ? `CHQ-${String(clientId).padStart(7, '0')}`
          : `VIR-${clientId}-001`,
        bank_name: methodA === 'check' ? BANKS[i % BANKS.length] : null,
        bank_agency: methodA === 'check' ? `Agence ${client.city || 'Centre'}` : null,
        issuer_name: methodA === 'check' ? issuer : null,
        account_rib: methodA === 'check' ? `0${10 + i} 012 0000000000000${i} 78` : null,
        maturity_date: methodA === 'check' ? addDays(today, 30 + i) : null,
      }, t);
      paymentTotal += 1;

      const inv2 = await createInvoice(clientId, {
        seq: 2,
        seed: clientId * 5 + 1,
        label: 'Facture trimestrielle',
        issue_date: addDays(today, -45 - i),
        due_date: addDays(today, -15 - (i % 5)),
        itemCount: 3,
      }, t);
      invoiceTotal += 1;

      const ttc2 = Number(inv2.amount_ttc);
      if (i % 3 === 0) {
        const partial = round2(ttc2 * 0.4);
        await applyPayment(inv2, partial, {
          payment_date: addDaysDate(today, -10),
          payment_method: 'check',
          reference: `CHQ-${String(clientId).padStart(7, '0')}-B`,
          bank_name: BANKS[(i + 1) % BANKS.length],
          bank_agency: 'Agence principale',
          issuer_name: issuer,
          maturity_date: addDays(today, 20),
        }, t);
        paymentTotal += 1;
        await inv2.update({ status: 'overdue' }, { transaction: t });
        inv2.status = 'overdue';
        recoveryInvoices.push(inv2);
      } else if (i % 3 === 1) {
        await inv2.update({ status: 'overdue' }, { transaction: t });
        inv2.status = 'overdue';
        recoveryInvoices.push(inv2);
      } else {
        const partial = round2(ttc2 * 0.55);
        await applyPayment(inv2, partial, {
          payment_date: addDaysDate(today, -5),
          payment_method: methodB,
          reference: `PMT-${clientId}-002`,
        }, t);
        paymentTotal += 1;
      }

      const inv3 = await createInvoice(clientId, {
        seq: 3,
        seed: clientId * 7 + 2,
        label: i % 4 === 0 ? 'Facture du jour' : 'Facture récente',
        issue_date: i % 4 === 0 ? todayStr : addDays(today, -10 - (i % 7)),
        due_date: addDays(today, 15 + (i % 20)),
        itemCount: 2,
      }, t);
      invoiceTotal += 1;

      if (i % 6 === 0) {
        const partial = round2(Number(inv3.amount_ttc) * 0.3);
        await applyPayment(inv3, partial, {
          payment_date: addDaysDate(today, -1),
          payment_method: 'cash',
          reference: `ESP-${clientId}`,
        }, t);
        paymentTotal += 1;
      }

      if (i % 5 === 1) {
        const amt = round2(Number(inv3.amount_ttc) * 0.25);
        await applyPayment(inv3, amt, {
          payment_date: today,
          payment_method: 'direct_debit',
          reference: `PRE-${clientId}-${todayStr.replace(/-/g, '')}`,
        }, t);
        paymentTotal += 1;
      }

      if (i % 7 === 2) {
        const pending = round2(ttc2 * 0.2);
        await applyPayment(inv2, pending, {
          payment_date: today,
          payment_method: 'check',
          reference: `CHQ-PND-${clientId}`,
          bank_name: 'UIB',
          issuer_name: issuer,
          maturity_date: addDays(today, 45),
          status: 'pending',
        }, t);
        paymentTotal += 1;
      }

      const inv4 = await createInvoice(clientId, {
        seq: 4,
        seed: clientId * 11 + 3,
        label: 'Facture impayée — recouvrement',
        issue_date: addDays(today, -60 - i),
        due_date: addDays(today, -20 - (i % 10)),
        itemCount: 2,
      }, t);
      invoiceTotal += 1;
      await inv4.update({ status: 'overdue' }, { transaction: t });
      inv4.status = 'overdue';
      recoveryInvoices.push(inv4);
    }

    for (let r = 0; r < Math.min(20, recoveryInvoices.length); r += 1) {
      const inv = recoveryInvoices[r];
      await inv.reload({ transaction: t });
      const balance = round2(Number(inv.amount_ttc) - Number(inv.amount_paid));
      const due = new Date(inv.due_date);
      due.setHours(0, 0, 0, 0);
      const overdueDays = Math.max(Math.floor((today - due) / 86400000), 1);
      const status = RECOVERY_STATUSES[r];

      await RecoveryCase.create(
        {
          client_id: inv.client_id,
          invoice_id: inv.id,
          recovery_agent_id: RECOVERY_AGENT_ID,
          status,
          priority: RECOVERY_PRIORITIES[r],
          overdue_amount: balance,
          penalty_amount: round2(balance * (0.05 + (r % 4) * 0.02)),
          overdue_days: overdueDays,
          notes: `${MARKER} Relance automatique — impayé depuis ${overdueDays} jours`,
          resolved_at: ['resolved', 'closed'].includes(status)
            ? addDaysDate(today, status === 'closed' ? -3 : -7)
            : null,
        },
        { transaction: t }
      );
      recoveryTotal += 1;
    }
  });

  console.log('✅ Demo billing data seeded');
  console.log(`   Clients:     ${clients.length}`);
  console.log(`   Invoices:    ${invoiceTotal} (4 per client)`);
  console.log(`   Payments:    ${paymentTotal} (mixed methods + some this month)`);
  console.log(`   Recovery:    ${recoveryTotal} cases on overdue invoices`);
  console.log('\nRefresh dashboard, clients, payments & recovery pages.');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  })
  .finally(() => sequelize.close());
