const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    // Si c'est une erreur métier qu'on a déclenchée nous-mêmes
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message
        });
    }

    // Sinon, c'est un crash serveur (erreur 500)
    res.status(500).json({
        success: false,
        message: 'Une erreur interne du serveur est survenue.'
    });
};

module.exports = errorHandler;
