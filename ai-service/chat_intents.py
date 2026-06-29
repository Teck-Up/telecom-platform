import logging
import re
import unicodedata
from typing import Optional

from chat_analytics import (
    format_client_status,
    format_contract_type,
    format_currency,
    format_datetime,
    format_status,
    run_analytical_query,
)
from db import ping_db

logger = logging.getLogger('telecom.chat.intents')

INTENT_PATTERNS: list[tuple[str, list[str]]] = [
    (
        'LAST_INVOICE_CLIENT',
        [
            r'client\s+(?:de\s+(?:la\s+)?)?derniere\s+facture',
            r'derniere\s+facture\s+(?:creee\s+)?(?:.*?)\s*client',
            r'qui\s+est\s+le\s+client\s+(?:de\s+(?:la\s+)?)?derniere\s+facture',
            r'quel\s+client\s+(?:de\s+(?:la\s+)?)?derniere\s+facture',
            r'client\s+de\s+la\s+facture\s+la\s+plus\s+recente',
        ],
    ),
    (
        'LAST_INVOICE',
        [
            r'derniere\s+facture\s+creee',
            r'quelle\s+est\s+la\s+derniere\s+facture',
            r'derniere\s+facture',
            r'last\s+invoice',
        ],
    ),
    (
        'TOTAL_INVOICES_TODAY',
        [
            r'total\s+des\s+factures\s+d[\s\']?aujourd[\s\']?hui',
            r'combien\s+on\s+a\s+facture\s+aujourd[\s\']?hui',
            r'chiffre\s+du\s+jour',
            r'facture\s+aujourd[\s\']?hui',
            r'montant\s+facture\s+aujourd[\s\']?hui',
        ],
    ),
    (
        'CLIENT_COUNT',
        [
            r'combien\s+de\s+clients\s+actifs',
            r'nombre\s+de\s+clients\s+actifs',
            r'clients\s+actifs',
            r'nombre\s+de\s+clients',
            r'total\s+clients',
            r'combien\s+de\s+clients',
        ],
    ),
    (
        'OVERDUE_TOTAL',
        [
            r'montant\s+des\s+impayes',
            r'total\s+impayes',
            r'combien\s+de\s+factures\s+en\s+retard',
            r'factures\s+en\s+retard',
            r'factures\s+impayees',
            r'impayes',
        ],
    ),
]


def normalize_message(message: str) -> str:
    text = unicodedata.normalize('NFKD', message.lower())
    text = ''.join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("'", ' ').replace('’', ' ')
    return re.sub(r'\s+', ' ', text).strip()


def detect_analytical_intent(message: str) -> Optional[str]:
    normalized = normalize_message(message)
    for intent, patterns in INTENT_PATTERNS:
        for pattern in patterns:
            if re.search(pattern, normalized):
                logger.debug('Intent matched | intent=%s pattern=%s', intent, pattern)
                return intent
    return None


def format_analytical_response(intent: str, data: dict) -> str:
    if intent == 'LAST_INVOICE_CLIENT':
        if not data.get('found'):
            return "Aucune facture n'a encore été créée sur la plateforme."
        display_name = data.get('company_name') or data.get('contact_name') or 'Client inconnu'
        parts = [
            f"Le client de la dernière facture créée (N° {data['invoice_number']}) est {display_name}.",
            f"Statut client : {format_client_status(data.get('client_status'))}.",
            f"Contrat : {format_contract_type(data.get('contract_type'))}.",
        ]
        if data.get('contact_name'):
            contact = data['contact_name']
            if data.get('contact_email'):
                contact += f" ({data['contact_email']})"
            parts.append(f"Contact : {contact}.")
        if data.get('city'):
            parts.append(f"Ville : {data['city']}.")
        parts.append(
            f"Facture : {format_currency(data['total_ttc'])} — "
            f"{format_status(data.get('invoice_status'))}, "
            f"créée le {format_datetime(data['created_at'])}."
        )
        return ' '.join(parts)

    if intent == 'LAST_INVOICE':
        if not data.get('found'):
            return "Aucune facture n'a encore été créée sur la plateforme."
        return (
            f"La dernière facture créée est la N° {data['invoice_number']} "
            f"d'un montant de {format_currency(data['total_ttc'])} "
            f"(Statut : {format_status(data['status'])}), "
            f"créée le {format_datetime(data['created_at'])}."
        )

    if intent == 'TOTAL_INVOICES_TODAY':
        return f"Le montant total facturé aujourd'hui est de {format_currency(data['total'])}."

    if intent == 'CLIENT_COUNT':
        count = data['count']
        suffix = 'client actif' if count == 1 else 'clients actifs'
        return f'Nous avons actuellement {count} {suffix} sur la plateforme.'

    if intent == 'OVERDUE_TOTAL':
        return (
            'Le montant total des factures en attente ou impayées '
            f"s'élève à {format_currency(data['unpaid'])}."
        )

    raise ValueError(f'Unknown intent for formatting: {intent}')


def try_analytical_response(message: str) -> Optional[str]:
    intent = detect_analytical_intent(message)
    if not intent:
        return None

    if not ping_db():
        logger.warning('Analytics intent detected but database unavailable | intent=%s', intent)
        return (
            "Je peux répondre à cette question avec les données de la plateforme, "
            'mais la connexion à la base de données est momentanément indisponible. '
            'Réessayez dans quelques instants ou consultez le tableau de bord.'
        )

    data = run_analytical_query(intent)
    response = format_analytical_response(intent, data)
    logger.info('Analytics response generated | intent=%s', intent)
    return response


HELP_MENU = """Je peux vous aider de plusieurs façons :

**Questions opérationnelles** (réponses en temps réel depuis la plateforme) :
• « Quelle est la dernière facture ? »
• « Quel est le client de la dernière facture ? »
• « Combien de clients actifs ? »
• « Quel est le montant des impayés ? »
• Ou toute question analytique en langage naturel (avec Gemini activé)

**Aide générale :**
• Factures — section « Factures » du menu
• Paiements — section « Paiements », bouton « Enregistrer un paiement »
• Recouvrement — équipe disponible pour les retards de paiement
• Support — support@telecom.fr · +33 1 23 45 67 89 (lun–ven, 8h–18h)

Posez une question précise ou choisissez un sujet ci-dessus."""
