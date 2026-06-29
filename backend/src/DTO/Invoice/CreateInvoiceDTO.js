class CreateInvoiceDTO {
    constructor(data) {
        this.invoice_number = data.invoice_number?.trim();
        this.client_id = data.client_id ? parseInt(data.client_id, 10) : null;
        this.billing_agent_id = data.billing_agent_id ? parseInt(data.billing_agent_id, 10) : null;
        this.amount_ht = data.amount_ht !== undefined ? parseFloat(data.amount_ht) : null;
        this.tva_rate = data.tva_rate !== undefined ? parseFloat(data.tva_rate) : 20.00;
        this.amount_ttc = data.amount_ttc !== undefined ? parseFloat(data.amount_ttc) : null;
        this.amount_paid = data.amount_paid !== undefined ? parseFloat(data.amount_paid) : 0;
        this.due_date = data.due_date?.trim();
        this.issue_date = data.issue_date?.trim();
        this.status = data.status || 'draft';
        this.description = data.description?.trim();
        this.pdf_path = data.pdf_path?.trim();
    }

    validate() {
        const errors = [];
        const validStatuses = ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'];

        if (!this.invoice_number) errors.push("Le numéro de facture (invoice_number) est obligatoire.");
        if (!this.client_id || isNaN(this.client_id)) errors.push("L'ID client (client_id) est obligatoire et doit être un nombre valide.");
        if (this.billing_agent_id !== null && isNaN(this.billing_agent_id)) errors.push("L'ID de l'agent de facturation doit être un nombre valide.");

        if (this.amount_ht === null || isNaN(this.amount_ht)) errors.push("Le montant HT (amount_ht) est obligatoire et doit être un nombre.");
        if (isNaN(this.tva_rate)) errors.push("Le taux de TVA (tva_rate) doit être un nombre.");
        if (this.amount_ttc === null || isNaN(this.amount_ttc)) errors.push("Le montant TTC (amount_ttc) est obligatoire et doit être un nombre.");
        if (isNaN(this.amount_paid)) errors.push("Le montant payé (amount_paid) doit être un nombre.");

        if (!this.due_date || isNaN(Date.parse(this.due_date))) errors.push("La date d'échéance (due_date) est obligatoire et doit être une date valide.");
        if (!this.issue_date || isNaN(Date.parse(this.issue_date))) errors.push("La date d'émission (issue_date) est obligatoire et doit être une date valide.");

        if (!validStatuses.includes(this.status)) errors.push("Le statut spécifié n'est pas valide.");

        return errors;
    }
}

module.exports = CreateInvoiceDTO;
