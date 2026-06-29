from database.connection import DatabaseConnection

class InvoiceRepository:
    def __init__(self):
        self.db = DatabaseConnection()

    def get_unpaid_invoices_stats(self):
        query = """
            SELECT COUNT(*) as unpaid_count, SUM(amount_ttc - amount_paid) as total_overdue
            FROM invoices WHERE status IN ('sent', 'partially_paid', 'overdue')
        """
        result = self.db.execute_query(query)
        return result[0] if result else {"unpaid_count": 0, "total_overdue": 0}

    def get_top_clients_by_revenue(self, limit=5):
        """Trouve les clients qui génèrent le plus de chiffre d'affaires"""
        query = """
            SELECT c.name, SUM(i.amount_ttc) as total_spent, COUNT(i.id) as invoice_count
            FROM clients c
            JOIN invoices i ON c.id = i.clientId
            GROUP BY c.id
            ORDER BY total_spent DESC
            LIMIT %s
        """
        return self.db.execute_query(query, (limit,))

    def get_revenue_by_status(self):
        """Répartition des montants par statut de facture"""
        query = "SELECT status, SUM(amount_ttc) as total_amount FROM invoices GROUP BY status"
        return self.db.execute_query(query)

    def get_revenue_history(self):
        query = "SELECT DATE(createdAt) as ds, SUM(amount_ttc) as y FROM invoices GROUP BY DATE(createdAt) ORDER BY ds ASC"
        return self.db.execute_query(query)
