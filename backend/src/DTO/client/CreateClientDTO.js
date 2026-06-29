class CreateClientDTO {
    constructor(data) {
        this.user_id = data.user_id ? parseInt(data.user_id, 10) : null;
        this.company_name = data.company_name?.trim();
        this.phone = data.phone?.trim();
        this.address = data.address?.trim();
        this.city = data.city?.trim();
        this.postal_code = data.postal_code?.trim();
        this.country = data.country?.trim() || 'France';
        this.siret = data.siret?.trim();
        this.contract_type = data.contract_type || 'postpaid';
        this.credit_limit = data.credit_limit !== undefined ? parseFloat(data.credit_limit) : 0;
        this.status = data.status || 'active';
    }

    validate() {
        const errors = [];
        const validContractTypes = ['prepaid', 'postpaid', 'enterprise'];
        const validStatuses = ['active', 'suspended', 'terminated'];

        if (!this.company_name) {
            errors.push("Le nom de l'entreprise (company_name) est obligatoire.");
        }
        if (this.user_id !== null && isNaN(this.user_id)) {
            errors.push("L'ID utilisateur (user_id) doit être un nombre valide.");
        }
        if (!validContractTypes.includes(this.contract_type)) {
            errors.push("Le type de contrat spécifié n'est pas valide.");
        }
        if (!validStatuses.includes(this.status)) {
            errors.push("Le statut spécifié n'est pas valide.");
        }
        if (isNaN(this.credit_limit)) {
            errors.push("La limite de crédit doit être un nombre valide.");
        }

        return errors;
    }
}

module.exports = CreateClientDTO;
