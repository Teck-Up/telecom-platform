from database.connection import DatabaseConnection


class BaseRepository:
    def __init__(self):
        self.db = DatabaseConnection()

    def execute_read_query(self, query, params=None):
        """
        Exécute une requête de lecture seule.
        Ajoute une couche de sécurité pour empêcher les modifications.
        """
        clean_query = query.strip().upper()

        # Sécurité : On interdit tout ce qui n'est pas un SELECT
        forbidden_keywords = ["INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER"]
        if any(keyword in clean_query for keyword in forbidden_keywords):
            raise Exception("Action non autorisée : Seules les requêtes SELECT sont permises.")

        return self.db.execute_query(query, params)
