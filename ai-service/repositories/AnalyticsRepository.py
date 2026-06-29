from database.connection import DatabaseConnection
class AnalyticsRepository:

    def __init__(self):
        # C'est cette ligne qui doit manquer ou être mal écrite
        self.db = DatabaseConnection()

    def get_revenue_history(self, start_date=None, end_date=None, granularity='day'):
        # On définit le format de regroupement
        formats = {
            'day': 'ds',
            'month': "DATE_FORMAT(ds, '%Y-%m-01')",
            'year': "YEAR(ds)"
        }
        group_by = formats.get(granularity, 'ds')

        # Requête de base sur la VUE
        query = f"SELECT {group_by} as period, SUM(y) as revenue FROM view_daily_revenue"
        params = []

        # Ajout des filtres de dates dynamiques
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

        query += f" GROUP BY period ORDER BY period ASC"
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

