class UpdateInvoiceItemDTO {
    constructor(data) {
        if (data.invoice_id !== undefined) this.invoice_id = data.invoice_id ? parseInt(data.invoice_id, 10) : null;
        if (data.description !== undefined) this.description = data.description?.trim();
        if (data.quantity !== undefined) this.quantity = parseFloat(data.quantity);
        if (data.unit_price !== undefined) this.unit_price = parseFloat(data.unit_price);
        if (data.total !== undefined) this.total = parseFloat(data.total);
    }

    validate() {
        const errors = [];

        if (this.invoice_id !== undefined && (!this.invoice_id || isNaN(this.invoice_id))) {
            errors.push("L'ID de la facture doit être un nombre valide.");
        }
        if (this.description !== undefined && !this.description) {
            errors.push("La description ne peut pas être vide.");
        }
        if (this.quantity !== undefined && isNaN(this.quantity)) {
            errors.push("La quantité doit être un nombre valide.");
        }
        if (this.unit_price !== undefined && isNaN(this.unit_price)) {
            errors.push("Le prix unitaire doit être un nombre valide.");
        }
        if (this.total !== undefined && isNaN(this.total)) {
            errors.push("Le total doit être un nombre valide.");
        }

        return errors;
    }
}

module.exports = UpdateInvoiceItemDTO;
