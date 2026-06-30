from database.connection import DatabaseConnection
class AnalyticsRepository:

    def __init__(self):
        # C'est cette ligne qui doit manquer ou être mal écrite
        self.db = DatabaseConnection()

    def get_revenue_history(self, start_date=None, end_date=None, granularity='day'):
        # 1. On définit le format de regroupement
        formats = {
            'day': 'ds',
            'month': "DATE_FORMAT(ds, '%Y-%m-01')",
            'year': "YEAR(ds)"
        }
        group_by = formats.get(granularity, 'ds')

        # 2. On sélectionne TOUTES les colonnes de la vue
        # Note : 'y' est utilisé par l'IA, 'revenue/paid/unpaid' par le Dashboard
        query = f"""
            SELECT 
                {group_by} as period, 
                SUM(y) as y, 
                SUM(y) as revenue, 
                SUM(paid) as paid, 
                SUM(unpaid) as unpaid 
            FROM view_revenue
        """
        params = []

        # 3. Filtres de dates
        if start_date or end_date:
            query += " WHERE"
            if start_date:
                query += " ds >= %s"
                params.append(start_date)
            if start_date and end_date:
                query += " AND"
            if end_date:
                query += " ds <= %s"
                params.append(end_date)

        query += " GROUP BY period ORDER BY period ASC"

        return self.db.execute_query(query, tuple(params))

    def get_dashboard_summary(self): # Assure-toi que le nom est EXACTEMENT celui-ci
        query = """
            SELECT 
                (SELECT SUM(amount_paid) FROM invoices WHERE status = 'paid') as total_revenue,
                (SELECT SUM(amount_ttc - amount_paid) FROM invoices WHERE status IN ('overdue', 'partially_paid', 'sent')) as total_debt,
                (SELECT COUNT(*) FROM clients WHERE status = 'active') as active_clients,
                (SELECT COUNT(*) FROM recovery_cases WHERE status = 'open') as active_recoveries
        """
        result = self.db.execute_query(query)
        return result[0] if result else {}

    def get_invoice_distribution(self, start_date, end_date):
        # On utilise des %s pour la sécurité
        query = """
            SELECT status, COUNT(*) as count 
            FROM invoices 
            WHERE issue_date BETWEEN %s AND %s 
            GROUP BY status
        """

        # On passe les paramètres dans un tuple
        params = (start_date, end_date)

        return self.db.execute_query(query, params)



