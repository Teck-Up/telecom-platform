const { Op } = require('sequelize');
const { RecoveryCase, RecoveryInteraction } = require('../models');

const ACTIVE_RECOVERY_STATUSES = ['open', 'in_progress', 'legal'];

const closeRecoveryCasesForPaidInvoice = async (invoiceId, recordedByUserId = null) => {
  const activeCases = await RecoveryCase.findAll({
    where: {
      invoice_id: invoiceId,
      status: { [Op.in]: ACTIVE_RECOVERY_STATUSES },
    },
  });

  if (!activeCases.length) return [];

  const now = new Date();
  const closedIds = [];

  for (const recoveryCase of activeCases) {
    await recoveryCase.update({
      status: 'closed',
      resolved_at: now,
      overdue_amount: 0,
    });

    await RecoveryInteraction.create({
      recovery_case_id: recoveryCase.id,
      interaction_type: 'note',
      content: 'Dossier clôturé automatiquement — facture intégralement réglée.',
      created_by: recordedByUserId,
    });

    closedIds.push(recoveryCase.id);
  }

  return closedIds;
};

module.exports = { closeRecoveryCasesForPaidInvoice };
