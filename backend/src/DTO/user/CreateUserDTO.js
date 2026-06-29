class CreateUserDTO {
    constructor(data) {
        this.name = data.name?.trim();
        this.email = data.email?.trim();
        this.password = data.password;
        this.role = data.role || 'client';
        this.is_active = data.is_active !== undefined ? Boolean(data.is_active) : true;
    }

    validate() {
        const errors = [];
        const validRoles = ['admin', 'billing_agent', 'recovery_agent', 'client'];

        if (!this.name) errors.push("Le nom est obligatoire.");
        if (!this.email || !this.email.includes('@')) errors.push("Un email valide est obligatoire.");
        if (!this.password || this.password.length < 6) errors.push("Le mot de passe est obligatoire et doit contenir au moins 6 caractères.");
        if (!validRoles.includes(this.role)) errors.push("Le rôle spécifié n'est pas valide.");

        return errors;
    }
}

module.exports = CreateUserDTO;
