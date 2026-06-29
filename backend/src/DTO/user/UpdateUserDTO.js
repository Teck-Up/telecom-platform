class UpdateUserDTO {
    constructor(data) {
        // On n'assigne la propriété que si elle est présente dans la requête
        if (data.name !== undefined) this.name = data.name?.trim();
        if (data.email !== undefined) this.email = data.email?.trim();
        if (data.password !== undefined) this.password = data.password;
        if (data.role !== undefined) this.role = data.role;
        if (data.is_active !== undefined) this.is_active = Boolean(data.is_active);
    }

    validate() {
        const errors = [];
        const validRoles = ['admin', 'billing_agent', 'recovery_agent', 'client'];

        if (this.name !== undefined && !this.name) {
            errors.push("Le nom ne peut pas être vide.");
        }
        if (this.email !== undefined && !this.email.includes('@')) {
            errors.push("L'email fourni n'est pas valide.");
        }
        if (this.password !== undefined && this.password.length < 6) {
            errors.push("Le mot de passe doit contenir au moins 6 caractères.");
        }
        if (this.role !== undefined && !validRoles.includes(this.role)) {
            errors.push("Le rôle spécifié n'est pas valide.");
        }

        return errors;
    }
}

module.exports = UpdateUserDTO;
