class LoginDTO {
    constructor(data) {
        this.email = data.email?.trim();
        this.password = data.password;
    }

    validate() {
        const errors = [];
        if (!this.email) errors.push("L'email est requis.");
        if (!this.password) errors.push("Le mot de passe est requis.");
        return errors;
    }
}

module.exports = LoginDTO;
