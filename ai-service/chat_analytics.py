import logging
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from db import fetch_one

logger = logging.getLogger('telecom.chat.analytics')

# Hardcoded read-only queries — never built from user input.
SQL_LAST_INVOICE = """
SELECT invoice_number, amount_ttc AS total_ttc, status, created_at
FROM invoices
ORDER BY created_at DESC
LIMIT 1
"""

SQL_LAST_INVOICE_CLIENT = """
SELECT
  i.invoice_number,
  i.amount_ttc AS total_ttc,
  i.status AS invoice_status,
  i.created_at,
  c.company_name,
  c.status AS client_status,
  c.city,
  c.contract_type,
  u.name AS contact_name,
  u.email AS contact_email
FROM invoices i
INNER JOIN clients c ON c.id = i.client_id
LEFT JOIN users u ON u.id = c.user_id
ORDER BY i.created_at DESC
LIMIT 1
"""

SQL_TOTAL_INVOICES_TODAY = """
SELECT COALESCE(SUM(amount_ttc), 0) AS total
FROM invoices
WHERE DATE(created_at) = CURDATE()
"""

SQL_CLIENT_COUNT = """
SELECT COUNT(*) AS count
FROM clients
WHERE status = 'active'
"""

SQL_OVERDUE_TOTAL = """
SELECT COALESCE(SUM(amount_ttc - amount_paid), 0) AS unpaid
FROM invoices
WHERE status IN ('overdue', 'sent', 'partially_paid')
"""

STATUS_LABELS = {
    'draft': 'Brouillon',
    'sent': 'Envoyée',
    'partially_paid': 'Partiellement payée',
    'paid': 'Payée',
    'overdue': 'En retard',
    'cancelled': 'Annulée',
}

CLIENT_STATUS_LABELS = {
    'active': 'Actif',
    'suspended': 'Suspendu',
    'terminated': 'Résilié',
}

CONTRACT_TYPE_LABELS = {
    'prepaid': 'Prépayé',
    'postpaid': 'Postpayé',
    'enterprise': 'Entreprise',
}


def _to_float(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def format_currency(amount: Any) -> str:
    value = _to_float(amount)
    formatted = f'{value:,.2f}'.replace(',', ' ').replace('.', ',')
    return f'{formatted} €'


def format_datetime(value: Any) -> str:
    if value is None:
        return '—'
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    return dt.strftime('%d/%m/%Y à %H:%M')


def format_status(status: Optional[str]) -> str:
    if not status:
        return 'Inconnu'
    return STATUS_LABELS.get(status, status.replace('_', ' ').capitalize())


def format_client_status(status: Optional[str]) -> str:
    if not status:
        return 'Inconnu'
    return CLIENT_STATUS_LABELS.get(status, status.replace('_', ' ').capitalize())


def format_contract_type(contract_type: Optional[str]) -> str:
    if not contract_type:
        return 'Non renseigné'
    return CONTRACT_TYPE_LABELS.get(contract_type, contract_type.replace('_', ' ').capitalize())


def query_last_invoice_client() -> dict[str, Any]:
    row = fetch_one(SQL_LAST_INVOICE_CLIENT)
    if not row:
        return {'found': False}
    return {
        'found': True,
        'invoice_number': row['invoice_number'],
        'total_ttc': _to_float(row['total_ttc']),
        'invoice_status': row['invoice_status'],
        'created_at': row['created_at'],
        'company_name': row.get('company_name'),
        'client_status': row.get('client_status'),
        'city': row.get('city'),
        'contract_type': row.get('contract_type'),
        'contact_name': row.get('contact_name'),
        'contact_email': row.get('contact_email'),
    }


def query_last_invoice() -> dict[str, Any]:
    row = fetch_one(SQL_LAST_INVOICE)
    if not row:
        return {'found': False}
    return {
        'found': True,
        'invoice_number': row['invoice_number'],
        'total_ttc': _to_float(row['total_ttc']),
        'status': row['status'],
        'created_at': row['created_at'],
    }


def query_total_invoices_today() -> dict[str, Any]:
    row = fetch_one(SQL_TOTAL_INVOICES_TODAY)
    return {'total': _to_float(row['total'] if row else 0)}


def query_active_client_count() -> dict[str, Any]:
    row = fetch_one(SQL_CLIENT_COUNT)
    return {'count': int(row['count']) if row else 0}


def query_overdue_total() -> dict[str, Any]:
    row = fetch_one(SQL_OVERDUE_TOTAL)
    return {'unpaid': _to_float(row['unpaid'] if row else 0)}


ANALYTICS_HANDLERS = {
    'LAST_INVOICE_CLIENT': query_last_invoice_client,
    'LAST_INVOICE': query_last_invoice,
    'TOTAL_INVOICES_TODAY': query_total_invoices_today,
    'CLIENT_COUNT': query_active_client_count,
    'OVERDUE_TOTAL': query_overdue_total,
}


def run_analytical_query(intent: str) -> dict[str, Any]:
    handler = ANALYTICS_HANDLERS.get(intent)
    if not handler:
        raise ValueError(f'Unknown analytical intent: {intent}')
    logger.info('Running analytical query | intent=%s', intent)
    return handler()
