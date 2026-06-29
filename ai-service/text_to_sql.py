import logging
import re
import unicodedata
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from db import fetch_all, ping_db
from gemini_client import chat_completion, is_gemini_configured, json_dumps
from sql_validator import SqlValidationError, validate_readonly_sql

logger = logging.getLogger('telecom.text_to_sql')

ANALYTICS_ERROR = (
    "Je n'ai pas pu récupérer ces données analytiques pour le moment. "
    'Veuillez réessayer ou reformuler votre question.'
)

DB_SCHEMA = """
Table `clients`:
- id INT PK
- user_id INT FK -> users.id
- company_name VARCHAR
- phone VARCHAR
- city VARCHAR
- contract_type ENUM('prepaid','postpaid','enterprise')
- status ENUM('active','suspended','terminated')
- created_at DATETIME

Table `users` (contact linked to client):
- id INT PK
- name VARCHAR
- email VARCHAR
- role ENUM('admin','billing_agent','recovery_agent','client')
- is_active BOOLEAN

Table `invoices`:
- id INT PK
- invoice_number VARCHAR
- client_id INT FK -> clients.id
- amount_ht DECIMAL
- amount_ttc DECIMAL  (total TTC — use this, NOT total_ttc)
- amount_paid DECIMAL (paid so far — use this, NOT paid_amount)
- issue_date DATE
- due_date DATE
- status ENUM('draft','sent','partially_paid','paid','overdue','cancelled')
- created_at DATETIME

Table `payments`:
- id INT PK
- invoice_id INT FK -> invoices.id
- client_id INT FK -> clients.id
- amount DECIMAL
- payment_date DATETIME
- payment_method ENUM('bank_transfer','credit_card','check','cash','direct_debit')
- reference VARCHAR
- status ENUM('success','pending','failed')
- created_at DATETIME

Useful joins:
- invoices.client_id = clients.id
- clients.user_id = users.id
- payments.invoice_id = invoices.id
- unpaid amount on invoice: amount_ttc - amount_paid
- overdue/unpaid invoices often have status IN ('overdue','sent','partially_paid')
""".strip()

SQL_GENERATION_SYSTEM = f"""You are a database assistant for TelecomPlatform (MySQL).
Return ONLY a valid, executable MySQL query inside a clean string.
Do NOT explain anything. Do NOT use markdown code blocks.
Only SELECT data. NEVER generate DROP, DELETE, UPDATE, INSERT, or ALTER statements.
Always include a reasonable LIMIT (max 100 rows) when listing rows.

{DB_SCHEMA}
"""

RESPONSE_SYSTEM = """You translate raw database query results into a friendly, professional, concise answer in French.
Use the € symbol for monetary amounts (format like 2 500,00 €).
Format dates as DD/MM/YYYY when relevant.
If rows are empty, say politely that no matching data was found.
Do not mention SQL, databases, or internal technical details.
Return plain text only, no markdown."""


def normalize_message(message: str) -> str:
    text = unicodedata.normalize('NFKD', message.lower())
    text = ''.join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("'", ' ').replace('’', ' ')
    return re.sub(r'\s+', ' ', text).strip()


def looks_like_analytical_question(message: str) -> bool:
    normalized = normalize_message(message)
    keywords = (
        'facture', 'factures', 'invoice', 'client', 'clients', 'paiement', 'paiements',
        'payment', 'impaye', 'impayes', 'retard', 'montant', 'total', 'combien', 'nombre',
        'dernier', 'derniere', 'recente', 'aujourd', 'actif', 'actifs', 'recouvrement',
        'chiffre', 'revenu', 'impay', 'overdue', 'du jour', 'statistique', 'analytique',
        'donne-moi', 'donne moi', 'liste', 'quel est', 'quelle est', 'quels', 'quelles',
    )
    if re.search(r'\bca\b', normalized):
        return True
    return any(keyword in normalized for keyword in keywords)


def generate_sql(question: str) -> str:
    sql = chat_completion(
        [
            {'role': 'system', 'content': SQL_GENERATION_SYSTEM},
            {'role': 'user', 'content': question},
        ],
        max_tokens=400,
        temperature=0.0,
    )
    logger.info('Generated SQL | preview=%s', sql[:200])
    return validate_readonly_sql(sql)


def execute_sql(sql: str) -> list[dict[str, Any]]:
    rows = fetch_all(sql, max_rows=100)
    logger.info('SQL executed | rows=%d', len(rows))
    return rows


def format_answer(question: str, rows: list[dict[str, Any]]) -> str:
    try:
        payload = json_dumps(rows)
        return chat_completion(
            [
                {'role': 'system', 'content': RESPONSE_SYSTEM},
                {
                    'role': 'user',
                    'content': (
                        f"User question: {question}\n"
                        f'Raw data: {payload}\n'
                        "Write the final French answer for the user."
                    ),
                },
            ],
            max_tokens=500,
            temperature=0.3,
        )
    except Exception as exc:
        logger.warning('LLM answer formatting failed, using local formatter | error=%s', exc)
        return format_answer_local(question, rows)


def _format_scalar(value: Any) -> str:
    if isinstance(value, Decimal):
        number = float(value)
        if number == int(number):
            return f'{int(number):,}'.replace(',', ' ')
        return f'{number:,.2f}'.replace(',', ' ').replace('.', ',') + ' €'
    if isinstance(value, (datetime, date)):
        if isinstance(value, datetime):
            return value.strftime('%d/%m/%Y à %H:%M')
        return value.strftime('%d/%m/%Y')
    return str(value)


def format_answer_local(question: str, rows: list[dict[str, Any]]) -> str:
    if not rows:
        return "Aucune donnée correspondante n'a été trouvée pour votre question."

    if len(rows) == 1 and len(rows[0]) == 1:
        key, value = next(iter(rows[0].items()))
        label = key.replace('_', ' ')
        formatted = _format_scalar(value)
        if 'count' in key or key.endswith('_count'):
            return f'Le résultat est de {formatted}.'
        if any(token in key for token in ('total', 'amount', 'unpaid', 'paid', 'ttc', 'sum')):
            if not formatted.endswith('€'):
                formatted = f'{formatted} €'
            return f'Le montant total est de {formatted}.'
        return f'{label.capitalize()} : {formatted}.'

    if len(rows) == 1:
        parts = [f'{key.replace("_", " ").capitalize()} : {_format_scalar(value)}' for key, value in rows[0].items()]
        return 'Voici le résultat : ' + ' · '.join(parts) + '.'

    return f'{len(rows)} enregistrements trouvés. Consultez le tableau de bord pour le détail complet.'


def answer_with_text_to_sql(question: str) -> Optional[str]:
    if not is_gemini_configured():
        return None
    if not ping_db():
        logger.warning('Text-to-SQL skipped: database unavailable')
        return None
    if not looks_like_analytical_question(question):
        return None

    try:
        sql = generate_sql(question)
        rows = execute_sql(sql)
        answer = format_answer(question, rows)
        logger.info('Text-to-SQL success | question=%s', question[:120])
        return answer
    except SqlValidationError as exc:
        logger.warning('SQL validation failed | error=%s', exc)
        return None
    except Exception as exc:
        logger.exception('Text-to-SQL pipeline failed | error=%s', exc)
        return None
