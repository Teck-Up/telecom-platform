class UpdatePaymentDTO {
    constructor(data) {
        if (data.invoice_id !== undefined) this.invoice_id = data.invoice_id ? parseInt(data.invoice_id, 10) : null;
        if (data.client_id !== undefined) this.client_id = data.client_id ? parseInt(data.client_id, 10) : null;
        if (data.amount !== undefined) this.amount = parseFloat(data.amount);
        if (data.payment_date !== undefined) this.payment_date = data.payment_date?.trim();
        if (data.payment_method !== undefined) this.payment_method = data.payment_method?.trim();
        if (data.reference !== undefined) this.reference = data.reference?.trim();
        if (data.notes !== undefined) this.notes = data.notes?.trim();
        if (data.recorded_by !== undefined) this.recorded_by = data.recorded_by ? parseInt(data.recorded_by, 10) : null;
    }

    validate() {
        const errors = [];
        const validMethods = ['bank_transfer', 'credit_card', 'check', 'cash', 'direct_debit'];

        if (this.invoice_id !== undefined && (!this.invoice_id || isNaN(this.invoice_id))) errors.push("L'ID de la facture doit être un nombre valide.");
        if (this.client_id !== undefined && (!this.client_id || isNaN(this.client_id))) errors.push("L'ID du client doit être un nombre valide.");
        if (this.amount !== undefined && isNaN(this.amount)) errors.push("Le montant doit être un nombre valide.");
        if (this.payment_date !== undefined && isNaN(Date.parse(this.payment_date))) errors.push("La date de paiement doit être une date valide.");
        if (this.payment_method !== undefined && !validMethods.includes(this.payment_method)) errors.push("La méthode de paiement spécifiée n'est pas valide.");
        if (this.recorded_by !== undefined && this.recorded_by !== null && isNaN(this.recorded_by)) errors.push("L'ID de l'enregistreur doit être un nombre valide.");

        return errors;
    }
}

module.exports = UpdatePaymentDTO;
