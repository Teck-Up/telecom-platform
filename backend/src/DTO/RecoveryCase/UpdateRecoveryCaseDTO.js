class UpdateRecoveryCaseDTO {
    constructor(data) {
        if (data.client_id !== undefined) this.client_id = data.client_id ? parseInt(data.client_id, 10) : null;
        if (data.invoice_id !== undefined) this.invoice_id = data.invoice_id ? parseInt(data.invoice_id, 10) : null;
        if (data.recovery_agent_id !== undefined) this.recovery_agent_id = data.recovery_agent_id ? parseInt(data.recovery_agent_id, 10) : null;
        if (data.status !== undefined) this.status = data.status;
        if (data.priority !== undefined) this.priority = data.priority;
        if (data.overdue_amount !== undefined) this.overdue_amount = parseFloat(data.overdue_amount);
        if (data.overdue_days !== undefined) this.overdue_days = parseInt(data.overdue_days, 10);
        if (data.notes !== undefined) this.notes = data.notes?.trim();
        if (data.resolved_at !== undefined) this.resolved_at = data.resolved_at?.trim();
    }

    validate() {
        const errors = [];
        const validStatuses = ['open', 'in_progress', 'resolved', 'legal', 'closed'];
        const validPriorities = ['low', 'medium', 'high', 'critical'];

        if (this.client_id !== undefined && (!this.client_id || isNaN(this.client_id))) {
            errors.push("L'ID du client doit être un nombre valide.");
        }
        if (this.invoice_id !== undefined && (!this.invoice_id || isNaN(this.invoice_id))) {
            errors.push("L'ID de la facture doit être un nombre valide.");
        }
        if (this.recovery_agent_id !== undefined && this.recovery_agent_id !== null && isNaN(this.recovery_agent_id)) {
            errors.push("L'ID de l'agent de recouvrement doit être un nombre valide.");
        }
        if (this.status !== undefined && !validStatuses.includes(this.status)) {
            errors.push("Le statut spécifié n'est pas valide.");
        }
        if (this.priority !== undefined && !validPriorities.includes(this.priority)) {
            errors.push("La priorité spécifiée n'est pas valide.");
        }
        if (this.overdue_amount !== undefined && isNaN(this.overdue_amount)) {
            errors.push("Le montant en retard doit être un nombre valide.");
        }
        if (this.overdue_days !== undefined && isNaN(this.overdue_days)) {
            errors.push("Le nombre de jours de retard doit être un nombre entier.");
        }
        if (this.resolved_at !== undefined && this.resolved_at !== null && isNaN(Date.parse(this.resolved_at))) {
            errors.push("La date de résolution doit être une date valide.");
        }

        return errors;
    }
}

module.exports = UpdateRecoveryCaseDTO;
