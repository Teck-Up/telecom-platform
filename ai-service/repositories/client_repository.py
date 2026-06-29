from database.connection import DatabaseConnection

class ClientRepository:
    def __init__(self):
        self.db = DatabaseConnection()

    def get_client_summary(self):
        """Statistiques globales sur la base client"""
        query = """
            SELECT 
                COUNT(*) as total_clients,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients
            FROM clients
        """
        result = self.db.execute_query(query)
        return result[0] if result else {}

    def get_client_details_by_name(self, name):
        """Cherche un client spécifique et ses dernières factures"""
        query = "SELECT * FROM clients WHERE name LIKE %s"
        return self.db.execute_query(query, (f"%{name}%",))
