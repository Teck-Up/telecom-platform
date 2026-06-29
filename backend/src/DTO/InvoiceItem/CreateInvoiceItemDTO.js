class CreateInvoiceItemDTO {
    constructor(data) {
        this.invoice_id = data.invoice_id ? parseInt(data.invoice_id, 10) : null;
        this.description = data.description?.trim();
        this.quantity = data.quantity !== undefined ? parseFloat(data.quantity) : 1;
        this.unit_price = data.unit_price !== undefined ? parseFloat(data.unit_price) : null;
        this.total = data.total !== undefined ? parseFloat(data.total) : null;
    }

    validate() {
        const errors = [];

        if (!this.invoice_id || isNaN(this.invoice_id)) {
            errors.push("L'ID de la facture (invoice_id) est obligatoire et doit être un nombre valide.");
        }
        if (!this.description) {
            errors.push("La description est obligatoire.");
        }
        if (isNaN(this.quantity)) {
            errors.push("La quantité (quantity) doit être un nombre valide.");
        }
        if (this.unit_price === null || isNaN(this.unit_price)) {
            errors.push("Le prix unitaire (unit_price) est obligatoire et doit être un nombre.");
        }
        if (this.total === null || isNaN(this.total)) {
            errors.push("Le total est obligatoire et doit être un nombre.");
        }

        return errors;
    }
}

module.exports = CreateInvoiceItemDTO;
