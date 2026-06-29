class CreateReminderDTO {
    constructor(data) {
        this.recovery_case_id = data.recovery_case_id ? parseInt(data.recovery_case_id, 10) : null;
        this.invoice_id = data.invoice_id ? parseInt(data.invoice_id, 10) : null;
        this.client_id = data.client_id ? parseInt(data.client_id, 10) : null;
        this.type = data.type?.trim();
        this.status = data.status || 'pending';
        this.sent_at = data.sent_at?.trim();
        this.response = data.response?.trim();
        this.created_by = data.created_by ? parseInt(data.created_by, 10) : null;
    }

    validate() {
        const errors = [];
        const validTypes = ['email', 'sms', 'phone', 'legal_notice'];
        const validStatuses = ['pending', 'sent', 'failed'];

        if (!this.recovery_case_id || isNaN(this.recovery_case_id)) {
            errors.push("L'ID du dossier de recouvrement (recovery_case_id) est obligatoire et doit être un nombre valide.");
        }
        if (!this.invoice_id || isNaN(this.invoice_id)) {
            errors.push("L'ID de la facture (invoice_id) est obligatoire et doit être un nombre valide.");
        }
        if (!this.client_id || isNaN(this.client_id)) {
            errors.push("L'ID du client (client_id) est obligatoire et doit être un nombre valide.");
        }
        if (!this.type || !validTypes.includes(this.type)) {
            errors.push("Le type de relance est obligatoire et doit être valide (email, sms, phone, legal_notice).");
        }
        if (!validStatuses.includes(this.status)) {
            errors.push("Le statut spécifié n'est pas valide.");
        }
        if (this.sent_at && isNaN(Date.parse(this.sent_at))) {
            errors.push("La date d'envoi (sent_at) doit être une date valide.");
        }
        if (this.created_by !== null && isNaN(this.created_by)) {
            errors.push("L'ID du créateur (created_by) doit être un nombre valide.");
        }

        return errors;
    }
}

module.exports = CreateReminderDTO;
