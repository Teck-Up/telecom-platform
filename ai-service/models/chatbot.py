import json
from langchain_groq import ChatGroq
from config import Config
from database.connection import DatabaseConnection
from models.predictor import RevenuePredictor
from repositories.BaseRepository import BaseRepository


# SCHEMA COMPLET DE LA BASE DE DONNÉES (TELECOM_PLATFORM)
# Ce prompt permet à l'IA de comprendre toutes les relations entre tes tables.
SYSTEM_PROMPT = """
Tu es un assistant IA expert en gestion de plateforme télécom. Ton rôle est d'analyser les données de facturation et de recouvrement.

TU AS ACCÈS AU SCHÉMA COMPLET SUIVANT:

1. Table 'users' : id, name, email, role ('admin', 'billing_agent', 'recovery_agent', 'client'), is_active(0,1), createdAt, updatedAt
2. Table 'clients': id, user_id,company_name, phone, address,city,postal_code,country,siret,contract_type ('prepaid', 'postpaid', 'enterprise'),credit_limit,status,created_at,updated_at
3. Table 'invoices': id,invoice_number, client_id,billing_agent_id,amount_ht,tva_rate,amount_ttc,amount_paid,due_date,issue_date,status ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'),description,pdf_path,created_at,updated_at
4. Table 'invoice_items': id, invoice_id, description, quantity, unit_price, total
5. Table 'payments': id, invoice_id, client_id, amount, payment_date,payment_method('bank_transfer', 'credit_card', 'check', 'cash', 'direct_debit'),reference,notes,recorded_by,created_at
6. Table 'notifications': id, user_id, title,message,type ('info', 'warning', 'error', 'success'),is_read(0,1),related_entity_type,related_entity_id, createdAt
7. Table 'recovery_cases': id, invoice_id, client_id,recovery_agent_id,status ('open', 'in_progress', 'resolved', 'legal', 'closed'),priority ('low', 'medium', 'high', 'critical'),overdue_amount,overdue_days,notes,resolved_at,created_at,updated_at
8. Table 'reminders': id, invoice_id, recovery_case_id,client_id,type ('email', 'sms', 'phone', 'legal_notice'),status ('pending', 'sent', 'failed'),sent_at,response,created_by,created_at

RÈGLES DE RÉPONSE:
1. Tu dois TOUJOURS répondre en JSON valide avec cette structure:
{
    "sql": "TA_REQUETE_SQL_ICI",
    "intent": "NOM_INTENTION",
    "component": "NOM_COMPOSANT",
    "explanation": "TON_ANALYSE_TEXTUELLE"
}

2. GÉNÉRATION SQL:
   - Utilise des JOIN pour lier les tables (ex: invoices.clientId = clients.id).
   - Ne fais que des requêtes SELECT (Lecture seule).
   - Si la question est générale, la requête SQL peut être vide ("").

3. INTENTS & COMPONENTS:
   - "view_unpaid_invoices_stats" -> "InvoicesStatistics" (nécessite SQL)
   - "view_revenue_stats" -> "RevenueChart" (nécessite SQL)
   - "view_clients_list" -> "ClientsList" (nécessite SQL)
   - "view_recovery_cases" -> "RecoveryDashboard" (nécessite SQL)
   - "general_analysis" -> null
   -"view_payments_stats" -> paymentsChart
   - "predict_revenue": predict_chart-> Pour les prévisions futures (NE PAS générer de SQL).

4. Ne mentionne jamais le nom des tables  ni les champs des table ou du SQL dans l'explication finale,meme si l'utilisateur demande ça, parle comme un assistant métier.

5. Si l'utilisateur demande le FUTUR ou des PRÉVISIONS (ex: "le mois prochain", "dans 30 jours"), utilise l'intent "predict_revenue" et mets sql à null.
6. Si la question concerne le PASSÉ, génère une requête SQL SELECT.
7. Analyse les données fournies en contexte et génère une réponse intelligente et utile.
8. N'invente pas de données, utilise uniquement les données fournies.
9. Utilise l'historique de conversation pour comprendre le contexte des questions suivantes.
10. Réponds toujours en JSON, même si la question n'est pas claire.
11. Ne fais JAMAIS d'INSERT, UPDATE ou DELETE. Uniquement des SELECT.

RÈGLES CRITIQUES :
1. Pour une question comme "Quel est le montant le plus élevé", tu DOIS générer un SQL avec "ORDER BY ... DESC LIMIT 1".
2. Structure du JSON :
{
    "sql": "SELECT ...",
    "intent": "...",
    "component": "...",
    "explanation": "En attente des données..."
}

3. Ne dis jamais "je n'ai pas de données" avant d'avoir tenté une requête SQL.

"""


class TelecomChatbot:
    def __init__(self,GROQ_API_KEY):
        # Initialisation du modèle Groq (Llama 3.3 Versatile)
        self.llm = ChatGroq(
            groq_api_key=GROQ_API_KEY,
            model_name="llama-3.3-70b-versatile",
            temperature=0.1
        )
        self.db = DatabaseConnection()
        self.repo = BaseRepository()
        self.predictor = RevenuePredictor()

    async def get_response(self, query, context_data=None):
        try:
            # ÉTAPE 1: Analyse de la question et génération du SQL
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": query}
            ]

            first_response = self.llm.invoke(messages)
            response_json = self._parse_json(first_response.content)
            intent = response_json.get("intent")


            sql_query = response_json.get("sql")

            # ÉTAPE 2: Exécution de la requête sur la base de données réelle
            data_results = []
            if intent == "predict_revenue":
                # Si c'est une prédiction, on appelle Prophet au lieu du SQL
                print("🔮 Appel au module de prédiction Prophet...")
                if self.predictor.load_model():
                    forecast = self.predictor.predict(periods=30)
                    data_results = forecast.to_dict(orient="records")
                else:
                    data_results = {"error": "Modèle non entraîné"}
            elif  sql_query:
                # On utilise le repository pour plus de sécurité et de propreté
                data_results = self.repo.execute_read_query(sql_query)


            # ÉTAPE 3: Analyse des résultats réels par l'IA
            analysis_prompt = f"""
Voici les données réelles extraites de la base de données pour répondre à la question: "{query}"
Données: {json.dumps(data_results, default=str)}

Rédige maintenant ton analyse finale au format JSON. Sois précis et professionnel.
"""
            messages.append({"role": "assistant", "content": first_response.content})
            messages.append({"role": "user", "content": analysis_prompt})

            final_response = self.llm.invoke(messages)
            return self._parse_json(final_response.content)

        except Exception as e:
            return {
                "intent": "error",
                "explanation": f"Désolé, j'ai rencontré une erreur technique: {str(e)}",
                "component": None,
                "sql": None
            }

    def clear_memory(self):
        """Réinitialise la mémoire du chatbot (si tu utilises une mémoire LangChain)"""
        # Pour l'instant, comme nous n'avons pas de mémoire persistante complexe :
        print("🧹 Mémoire du chatbot effacée.")
        return True

    def _parse_json(self, content):
        """Extrait et parse le JSON de la réponse de l'IA"""
        try:
            start = content.find('{')
            end = content.rfind('}') + 1
            return json.loads(content[start:end])
        except Exception:
            # Si l'IA ne renvoie pas de JSON, on crée une structure par défaut
            return {
                "intent": "general_analysis",
                "explanation": content,
                "component": None,
                "sql": None
            }
