class CreateNotificationDTO {
    constructor(data) {
        this.user_id = data.user_id ? parseInt(data.user_id, 10) : null;
        this.title = data.title?.trim();
        this.message = data.message?.trim();
        this.type = data.type || 'info';
        this.is_read = data.is_read !== undefined ? Boolean(data.is_read) : false;
        this.related_entity_type = data.related_entity_type?.trim();
        this.related_entity_id = data.related_entity_id ? parseInt(data.related_entity_id, 10) : null;
    }

    validate() {
        const errors = [];
        const validTypes = ['info', 'warning', 'error', 'success'];

        if (!this.user_id || isNaN(this.user_id)) errors.push("L'ID utilisateur (user_id) est obligatoire et doit être un nombre.");
        if (!this.title) errors.push("Le titre de la notification est obligatoire.");
        if (!this.message) errors.push("Le message de la notification est obligatoire.");
        if (!validTypes.includes(this.type)) errors.push("Le type de notification spécifié n'est pas valide.");
        if (this.related_entity_id !== null && isNaN(this.related_entity_id)) errors.push("L'ID de l'entité liée doit être un nombre valide.");

        return errors;
    }
}

module.exports = CreateNotificationDTO;
