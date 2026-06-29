class UpdateNotificationDTO {
    constructor(data) {
        if (data.user_id !== undefined) this.user_id = data.user_id ? parseInt(data.user_id, 10) : null;
        if (data.title !== undefined) this.title = data.title?.trim();
        if (data.message !== undefined) this.message = data.message?.trim();
        if (data.type !== undefined) this.type = data.type;
        if (data.is_read !== undefined) this.is_read = Boolean(data.is_read);
        if (data.related_entity_type !== undefined) this.related_entity_type = data.related_entity_type?.trim();
        if (data.related_entity_id !== undefined) this.related_entity_id = data.related_entity_id ? parseInt(data.related_entity_id, 10) : null;
    }

    validate() {
        const errors = [];
        const validTypes = ['info', 'warning', 'error', 'success'];

        if (this.user_id !== undefined && (!this.user_id || isNaN(this.user_id))) errors.push("L'ID utilisateur doit être un nombre valide.");
        if (this.title !== undefined && !this.title) errors.push("Le titre ne peut pas être vide.");
        if (this.message !== undefined && !this.message) errors.push("Le message ne peut pas être vide.");
        if (this.type !== undefined && !validTypes.includes(this.type)) errors.push("Le type de notification spécifié n'est pas valide.");
        if (this.related_entity_id !== undefined && this.related_entity_id !== null && isNaN(this.related_entity_id)) errors.push("L'ID de l'entité liée doit être un nombre valide.");

        return errors;
    }
}

module.exports = UpdateNotificationDTO;
