const validateDto = (DtoClass) => {
    return (req, res, next) => {
        const dtoInstance = new DtoClass(req.body);

        const errors = dtoInstance.validate();

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Erreur de validation des données',
                errors
            });
        }

        // 4. Optionnel mais recommandé : on remplace req.body par les données nettoyées du DTO
        req.body = dtoInstance;

        next();
    };
};

module.exports = validateDto;
