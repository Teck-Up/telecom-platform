class UpdateReminderDTO {
    constructor(data) {
        if (data.recovery_case_id !== undefined) this.recovery_case_id = data.recovery_case_id ? parseInt(data.recovery_case_id, 10) : null;
        if (data.invoice_id !== undefined) this.invoice_id = data.invoice_id ? parseInt(data.invoice_id, 10) : null;
        if (data.client_id !== undefined) this.client_id = data.client_id ? parseInt(data.client_id, 10) : null;
        if (data.type !== undefined) this.type = data.type?.trim();
        if (data.status !== undefined) this.status = data.status;
        if (data.sent_at !== undefined) this.sent_at = data.sent_at?.trim();
        if (data.response !== undefined) this.response = data.response?.trim();
        if (data.created_by !== undefined) this.created_by = data.created_by ? parseInt(data.created_by, 10) : null;
    }

    validate() {
        const errors = [];
        const validTypes = ['email', 'sms', 'phone', 'legal_notice'];
        const validStatuses = ['pending', 'sent', 'failed'];

        if (this.recovery_case_id !== undefined && (!this.recovery_case_id || isNaN(this.recovery_case_id))) {
            errors.push("L'ID du dossier de recouvrement doit être un nombre valide.");
        }
        if (this.invoice_id !== undefined && (!this.invoice_id || isNaN(this.invoice_id))) {
            errors.push("L'ID de la facture doit être un nombre valide.");
        }
        if (this.client_id !== undefined && (!this.client_id || isNaN(this.client_id))) {
            errors.push("L'ID du client doit être un nombre valide.");
        }
        if (this.type !== undefined && !validTypes.includes(this.type)) {
            errors.push("Le type de relance spécifié n'est pas valide.");
        }
        if (this.status !== undefined && !validStatuses.includes(this.status)) {
            errors.push("Le statut spécifié n'est pas valide.");
        }
        if (this.sent_at !== undefined && this.sent_at !== null && isNaN(Date.parse(this.sent_at))) {
            errors.push("La date d'envoi doit être une date valide.");
        }
        if (this.created_by !== undefined && this.created_by !== null && isNaN(this.created_by)) {
            errors.push("L'ID du créateur doit être un nombre valide.");
        }

        return errors;
    }
}

module.exports = UpdateReminderDTO;
