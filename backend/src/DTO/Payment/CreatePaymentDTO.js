class CreatePaymentDTO {
    constructor(data) {
        this.invoice_id = data.invoice_id ? parseInt(data.invoice_id, 10) : null;
        this.client_id = data.client_id ? parseInt(data.client_id, 10) : null;
        this.amount = data.amount !== undefined ? parseFloat(data.amount) : null;
        this.payment_date = data.payment_date?.trim();
        this.payment_method = data.payment_method?.trim();
        this.reference = data.reference?.trim();
        this.notes = data.notes?.trim();
        this.recorded_by = data.recorded_by ? parseInt(data.recorded_by, 10) : null;
    }

    validate() {
        const errors = [];
        const validMethods = ['bank_transfer', 'credit_card', 'check', 'cash', 'direct_debit'];

        if (!this.invoice_id || isNaN(this.invoice_id)) errors.push("L'ID de la facture (invoice_id) est obligatoire.");
        if (!this.client_id || isNaN(this.client_id)) errors.push("L'ID du client (client_id) est obligatoire.");
        if (this.amount === null || isNaN(this.amount)) errors.push("Le montant (amount) est obligatoire et doit être un nombre.");
        if (!this.payment_date || isNaN(Date.parse(this.payment_date))) errors.push("La date de paiement (payment_date) est obligatoire et doit être une date valide.");
        if (!this.payment_method || !validMethods.includes(this.payment_method)) errors.push("La méthode de paiement est obligatoire et doit être valide.");
        if (this.recorded_by !== null && isNaN(this.recorded_by)) errors.push("L'ID de l'enregistreur (recorded_by) doit être un nombre valide.");

        return errors;
    }
}

module.exports = CreatePaymentDTO;
