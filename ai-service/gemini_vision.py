import json
import logging
import re
from typing import Any, Optional

from document_parser import ParsedPaymentDocument, format_rib_display
from gemini_client import get_client, get_model, is_gemini_configured

logger = logging.getLogger('telecom.gemini.vision')

VALID_METHODS = {'bank_transfer', 'credit_card', 'check', 'cash', 'direct_debit'}
VALID_DOC_TYPES = {'cheque', 'traite', 'virement'}
VALID_CURRENCIES = {'TND', 'EUR'}

SYSTEM_PROMPT = """You extract payment information from scanned Tunisian financial documents (UIB cheques, lettres de change / traites, virements).

Return ONLY valid JSON (no markdown):
{
  "amount": number or null,
  "reference": string or null,
  "date": "YYYY-MM-DD or null (issue/creation date)",
  "maturity_date": "YYYY-MM-DD or null (échéance — CRITICAL for traites)",
  "method": "check" | "bank_transfer" | "direct_debit" | "cash" | "credit_card" | null,
  "document_type": "cheque" | "traite" | "virement" | null,
  "currency": "TND" | "EUR" | null,
  "metadata": {
    "bank_name": string or null,
    "bank_agency": string or null,
    "issuer_name": string or null,
    "account_rib": string or null,
    "drawee_name": string or null
  }
}

Document-specific rules:

CHÈQUES (checks):
- reference = Chèque N° prefixed CHQ- (e.g. CHQ-0000001)
- metadata.issuer_name = Titulaire du compte / Tireur (e.g. FOULEN BEN FOULEN)
- metadata.account_rib = full RIB/RIP 20-digit layout (digits only or spaced)
- metadata.bank_name from header/logo (e.g. UIB, BIAT, STB)
- metadata.bank_agency = Payable à / agence address line
- method = check
- Do NOT use max-value disclaimers (30 000 DT) as amount if cheque amount is blank

LETTRES DE CHANGE / TRAITES:
- reference = L-CN / ordre number prefixed LCN- (e.g. LCN-008857459455)
- metadata.issuer_name = Nom du Tireur / Vendeur
- metadata.drawee_name = Nom du Tiré / Acheteur
- metadata.account_rib = RIB ou RIP du Tiré (code étab + agence + compte + clé)
- maturity_date = Date d'échéance (separate from date de création)
- date = date de création / émission
- metadata.bank_agency = Domiciliation (agence bancaire & adresse)
- method = direct_debit
- Tunisian amount "2 520,000 DT" -> amount 2520.0, currency TND

General:
- Return null for unknown fields
- JSON only, no explanation"""


def _parse_json_response(raw: str) -> dict[str, Any]:
    text = raw.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*```$', '', text)
    return json.loads(text)


def _normalize_date(value: Any) -> Optional[str]:
    if not value:
        return None
    text = str(value).strip()
    if re.fullmatch(r'\d{4}-\d{2}-\d{2}', text):
        return text
    match = re.fullmatch(r'(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})', text)
    if not match:
        return None
    day, month, year = match.groups()
    if len(year) == 2:
        year = f'20{year}'
    return f'{year}-{month.zfill(2)}-{day.zfill(2)}'


def _normalize_parsed(data: dict[str, Any]) -> ParsedPaymentDocument:
    amount = data.get('amount')
    if amount is not None:
        try:
            amount = round(float(amount), 3)
            if amount <= 0:
                amount = None
        except (TypeError, ValueError):
            amount = None

    reference = data.get('reference')
    reference = str(reference).strip() if reference else None

    metadata_raw = data.get('metadata') if isinstance(data.get('metadata'), dict) else {}
    bank_name = metadata_raw.get('bank_name') or data.get('bank_name')
    bank_agency = metadata_raw.get('bank_agency') or data.get('bank_agency')
    issuer_name = metadata_raw.get('issuer_name') or data.get('issuer_name')
    account_rib = metadata_raw.get('account_rib') or data.get('account_rib')
    drawee_name = metadata_raw.get('drawee_name') or data.get('drawee_name')

    bank_name = str(bank_name).strip()[:100] if bank_name else None
    bank_agency = str(bank_agency).strip()[:255] if bank_agency else None
    issuer_name = str(issuer_name).strip()[:255] if issuer_name else None
    drawee_name = str(drawee_name).strip()[:255] if drawee_name else None
    if account_rib:
        account_rib = format_rib_display(str(account_rib)) or re.sub(r'[^\d]', '', str(account_rib))[:30]

    method = data.get('method')
    method = method if method in VALID_METHODS else None

    document_type = data.get('document_type')
    document_type = document_type if document_type in VALID_DOC_TYPES else None

    currency = data.get('currency')
    currency = currency if currency in VALID_CURRENCIES else None

    if method is None and document_type == 'cheque':
        method = 'check'
    if method is None and document_type == 'traite':
        method = 'direct_debit'

    return ParsedPaymentDocument(
        amount=amount,
        reference=reference,
        date=_normalize_date(data.get('date')),
        maturity_date=_normalize_date(data.get('maturity_date')),
        method=method,
        document_type=document_type,
        currency=currency,
        bank_name=bank_name,
        bank_agency=bank_agency,
        issuer_name=issuer_name,
        account_rib=account_rib,
        drawee_name=drawee_name,
    )


def analyze_payment_image(image_bytes: bytes, mime_type: str) -> ParsedPaymentDocument:
    if not is_gemini_configured():
        raise RuntimeError('GEMINI_API_KEY is not configured')

    from google.genai import types

    client = get_client()
    model = get_model()
    logger.info('Gemini vision payment scan | model=%s mime=%s bytes=%d', model, mime_type, len(image_bytes))

    response = client.models.generate_content(
        model=model,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type or 'image/jpeg'),
            'Extract all Tunisian payment document fields as JSON.',
        ],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.0,
            max_output_tokens=700,
            response_mime_type='application/json',
        ),
    )

    raw = (response.text or '').strip()
    if not raw:
        raise RuntimeError('Gemini vision returned an empty response')

    logger.debug('Gemini vision raw JSON | preview=%s', raw[:400])
    parsed = _normalize_parsed(_parse_json_response(raw))
    logger.info(
        'Gemini vision parsed | amount=%s reference=%s maturity=%s rib=%s bank=%s',
        parsed.amount,
        parsed.reference,
        parsed.maturity_date,
        parsed.account_rib,
        parsed.bank_name,
    )
    return parsed
