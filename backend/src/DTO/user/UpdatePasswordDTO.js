class UpdatePasswordDTO {
    constructor(data) {
        this.password = data.password;
    }

    validate() {
        const errors = [];
        if (!this.password || this.password.length < 6) {
            errors.push("Le mot de passe est requis et doit contenir au moins 6 caractères.");
        }
        return errors;
    }
}

module.exports = UpdatePasswordDTO;
