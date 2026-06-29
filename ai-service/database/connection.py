
import mysql.connector
from mysql.connector import Error
from config import Config


class DatabaseConnection:
    def __init__(self):
        self.connection = None

    def connect(self):
        """
        Établit une connexion à la base de données MySQL en utilisant
        les paramètres définis dans config.py.
        """
        try:
            self.connection = mysql.connector.connect(
                host=Config.DB_HOST,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                database=Config.DB_NAME
            )
            if self.connection.is_connected():
                print(f"✅ Connecté à la base de données MySQL : {Config.DB_NAME}")
                return self.connection
        except Error as e:
            print(f"❌ Erreur lors de la connexion à MySQL : {e}")
            return None

    def close(self):
        """
        Ferme proprement la connexion à la base de données.
        """
        if self.connection and self.connection.is_connected():
            self.connection.close()
            print("🔌 Connexion MySQL fermée")

    def execute_query(self, query, params=None):
        """
        Exécute une requête SQL (SELECT) et retourne les résultats
        sous forme de liste de dictionnaires.
        """
        cursor = None
        try:
            # S'assurer que la connexion est ouverte
            if not self.connection or not self.connection.is_connected():
                self.connect()

            # Utiliser dictionary=True pour avoir des résultats sous forme de dict
            cursor = self.connection.cursor(dictionary=True)
            cursor.execute(query, params)
            result = cursor.fetchall()
            return result
        except Error as e:
            print(f"❌ Erreur lors de l'exécution de la requête : {e}")
            return None
        finally:
            if cursor:
                cursor.close()
