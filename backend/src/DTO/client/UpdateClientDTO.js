class UpdateClientDTO {
    constructor(data) {
        if (data.user_id !== undefined) this.user_id = data.user_id ? parseInt(data.user_id, 10) : null;
        if (data.company_name !== undefined) this.company_name = data.company_name?.trim();
        if (data.phone !== undefined) this.phone = data.phone?.trim();
        if (data.address !== undefined) this.address = data.address?.trim();
        if (data.city !== undefined) this.city = data.city?.trim();
        if (data.postal_code !== undefined) this.postal_code = data.postal_code?.trim();
        if (data.country !== undefined) this.country = data.country?.trim();
        if (data.siret !== undefined) this.siret = data.siret?.trim();
        if (data.contract_type !== undefined) this.contract_type = data.contract_type;
        if (data.credit_limit !== undefined) this.credit_limit = parseFloat(data.credit_limit);
        if (data.status !== undefined) this.status = data.status;
    }

    validate() {
        const errors = [];
        const validContractTypes = ['prepaid', 'postpaid', 'enterprise'];
        const validStatuses = ['active', 'suspended', 'terminated'];

        if (this.company_name !== undefined && !this.company_name) {
            errors.push("Le nom de l'entreprise ne peut pas être vide.");
        }
        if (this.user_id !== undefined && this.user_id !== null && isNaN(this.user_id)) {
            errors.push("L'ID utilisateur (user_id) doit être un nombre valide.");
        }
        if (this.contract_type !== undefined && !validContractTypes.includes(this.contract_type)) {
            errors.push("Le type de contrat spécifié n'est pas valide.");
        }
        if (this.status !== undefined && !validStatuses.includes(this.status)) {
            errors.push("Le statut spécifié n'est pas valide.");
        }
        if (this.credit_limit !== undefined && isNaN(this.credit_limit)) {
            errors.push("La limite de crédit doit être un nombre valide.");
        }

        return errors;
    }
}

module.exports = UpdateClientDTO;
