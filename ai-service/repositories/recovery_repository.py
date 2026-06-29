from database.connection import DatabaseConnection

class RecoveryRepository:
    def __init__(self):
        self.db = DatabaseConnection()

    def get_active_recovery_stats(self):
        """Statistiques sur les dossiers de recouvrement en cours"""
        query = """
            SELECT status, COUNT(*) as count, SUM(currentAmount) as total_amount
            FROM recovery_cases
            GROUP BY status
        """
        return self.db.execute_query(query)
