

import os
from dotenv import load_dotenv

# Charger les variables d'environnement du fichier .env
load_dotenv()


class Config:
    """
    Configuration centralisée de l'application AI Service.
    Lit les variables d'environnement et définit des valeurs par défaut.
    """

    # Configuration du Serveur FastAPI
    PORT = int(os.getenv("PORT", 8000))
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"

    # Configuration de l'IA (Groq)
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    MODEL_NAME = os.getenv("MODEL_NAME", "llama-3.3-70b-versatile")

    # Configuration de la Base de Données MySQL (Pour Prophet)
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
    DB_NAME = os.getenv("DB_NAME", "telecom_platform")

    @staticmethod
    def validate():
        """
        Vérifie que les variables critiques sont bien définies.
        """
        if not Config.GROQ_API_KEY:
            print("⚠️ ATTENTION : GROQ_API_KEY n'est pas définie dans le fichier .env")

        if not Config.DB_PASSWORD and Config.DB_HOST != "localhost":
            print("⚠️ ATTENTION : Le mot de passe de la base de données est vide")


Config.validate()
