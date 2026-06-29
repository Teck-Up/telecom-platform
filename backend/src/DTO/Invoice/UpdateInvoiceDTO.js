class UpdateInvoiceDTO {
    constructor(data) {
        if (data.invoice_number !== undefined) this.invoice_number = data.invoice_number?.trim();
        if (data.client_id !== undefined) this.client_id = data.client_id ? parseInt(data.client_id, 10) : null;
        if (data.billing_agent_id !== undefined) this.billing_agent_id = data.billing_agent_id ? parseInt(data.billing_agent_id, 10) : null;
        if (data.amount_ht !== undefined) this.amount_ht = parseFloat(data.amount_ht);
        if (data.tva_rate !== undefined) this.tva_rate = parseFloat(data.tva_rate);
        if (data.amount_ttc !== undefined) this.amount_ttc = parseFloat(data.amount_ttc);
        if (data.amount_paid !== undefined) this.amount_paid = parseFloat(data.amount_paid);
        if (data.due_date !== undefined) this.due_date = data.due_date?.trim();
        if (data.issue_date !== undefined) this.issue_date = data.issue_date?.trim();
        if (data.status !== undefined) this.status = data.status;
        if (data.description !== undefined) this.description = data.description?.trim();
        if (data.pdf_path !== undefined) this.pdf_path = data.pdf_path?.trim();
    }

    validate() {
        const errors = [];
        const validStatuses = ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'];

        if (this.invoice_number !== undefined && !this.invoice_number) errors.push("Le numéro de facture ne peut pas être vide.");
        if (this.client_id !== undefined && (!this.client_id || isNaN(this.client_id))) errors.push("L'ID client doit être un nombre valide.");
        if (this.billing_agent_id !== undefined && this.billing_agent_id !== null && isNaN(this.billing_agent_id)) errors.push("L'ID de l'agent de facturation doit être un nombre valide.");

        if (this.amount_ht !== undefined && isNaN(this.amount_ht)) errors.push("Le montant HT doit être un nombre.");
        if (this.tva_rate !== undefined && isNaN(this.tva_rate)) errors.push("Le taux de TVA doit être un nombre.");
        if (this.amount_ttc !== undefined && isNaN(this.amount_ttc)) errors.push("Le montant TTC doit être un nombre.");
        if (this.amount_paid !== undefined && isNaN(this.amount_paid)) errors.push("Le montant payé doit être un nombre.");

        if (this.due_date !== undefined && isNaN(Date.parse(this.due_date))) errors.push("La date d'échéance doit être une date valide.");
        if (this.issue_date !== undefined && isNaN(Date.parse(this.issue_date))) errors.push("La date d'émission doit être une date valide.");

        if (this.status !== undefined && !validStatuses.includes(this.status)) errors.push("Le statut spécifié n'est pas valide.");

        return errors;
    }
}

module.exports = UpdateInvoiceDTO;
