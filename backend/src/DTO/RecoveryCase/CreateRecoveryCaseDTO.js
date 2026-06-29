class CreateRecoveryCaseDTO {
    constructor(data) {
        this.client_id = data.client_id ? parseInt(data.client_id, 10) : null;
        this.invoice_id = data.invoice_id ? parseInt(data.invoice_id, 10) : null;
        this.recovery_agent_id = data.recovery_agent_id ? parseInt(data.recovery_agent_id, 10) : null;
        this.status = data.status || 'open';
        this.priority = data.priority || 'medium';
        this.overdue_amount = data.overdue_amount !== undefined ? parseFloat(data.overdue_amount) : null;
        this.overdue_days = data.overdue_days !== undefined ? parseInt(data.overdue_days, 10) : 0;
        this.notes = data.notes?.trim();
        this.resolved_at = data.resolved_at?.trim();
    }

    validate() {
        const errors = [];
        const validStatuses = ['open', 'in_progress', 'resolved', 'legal', 'closed'];
        const validPriorities = ['low', 'medium', 'high', 'critical'];

        if (!this.client_id || isNaN(this.client_id)) {
            errors.push("L'ID du client (client_id) est obligatoire et doit être un nombre valide.");
        }
        if (!this.invoice_id || isNaN(this.invoice_id)) {
            errors.push("L'ID de la facture (invoice_id) est obligatoire et doit être un nombre valide.");
        }
        if (this.recovery_agent_id !== null && isNaN(this.recovery_agent_id)) {
            errors.push("L'ID de l'agent de recouvrement doit être un nombre valide.");
        }
        if (!validStatuses.includes(this.status)) {
            errors.push("Le statut spécifié n'est pas valide.");
        }
        if (!validPriorities.includes(this.priority)) {
            errors.push("La priorité spécifiée n'est pas valide.");
        }
        if (this.overdue_amount === null || isNaN(this.overdue_amount)) {
            errors.push("Le montant en retard (overdue_amount) est obligatoire et doit être un nombre.");
        }
        if (isNaN(this.overdue_days)) {
            errors.push("Le nombre de jours de retard (overdue_days) doit être un nombre entier.");
        }
        if (this.resolved_at && isNaN(Date.parse(this.resolved_at))) {
            errors.push("La date de résolution (resolved_at) doit être une date valide.");
        }

        return errors;
    }
}

module.exports = CreateRecoveryCaseDTO;
