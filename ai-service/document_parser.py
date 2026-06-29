import re
import logging
from dataclasses import dataclass, asdict
from typing import Any, Optional

from logging_config import preview_text

logger = logging.getLogger('telecom.parser')

MAX_AMOUNT = 1_000_000


@dataclass
class ParsedPaymentDocument:
    amount: Optional[float] = None
    reference: Optional[str] = None
    date: Optional[str] = None
    maturity_date: Optional[str] = None
    method: Optional[str] = None
    document_type: Optional[str] = None
    currency: Optional[str] = None
    bank_name: Optional[str] = None
    bank_agency: Optional[str] = None
    issuer_name: Optional[str] = None
    account_rib: Optional[str] = None
    drawee_name: Optional[str] = None

    def to_response(self) -> dict[str, Any]:
        metadata = {
            key: value
            for key, value in {
                'bank_name': self.bank_name,
                'bank_agency': self.bank_agency,
                'issuer_name': self.issuer_name,
                'account_rib': format_rib_display(self.account_rib) or self.account_rib,
                'drawee_name': self.drawee_name,
            }.items()
            if value
        }
        return {
            'amount': self.amount,
            'reference': self.reference,
            'date': self.date,
            'maturity_date': self.maturity_date,
            'method': self.method,
            'document_type': self.document_type,
            'currency': self.currency,
            'metadata': metadata or None,
        }


def normalize_ocr_text(text: str) -> str:
    t = text.replace('\u00a0', ' ')
    replacements = {
        '€': ' EUR ',
        '°': ' ',
        ' n0 ': ' n ',
        ' nO ': ' n ',
        ' n° ': ' n ',
        'cheque': 'chèque',
        'Cheque': 'Chèque',
        'CHEQUE': 'CHÈQUE',
        'CHEQUE': 'CHÈQUE',
        'Echéance': 'Échéance',
        'echéance': 'échéance',
        'viremenl': 'virement',
        'viremenI': 'virement',
        'montanl': 'montant',
        'montanI': 'montant',
        'Lettre de change': 'lettre de change',
    }
    for old, new in replacements.items():
        t = t.replace(old, new)
    return re.sub(r'\s+', ' ', t).strip()


def _normalize_amount(raw: str, allow_three_decimals: bool = False) -> Optional[float]:
    cleaned = raw.strip().replace('\u00a0', ' ')
    cleaned = re.sub(r'[€EUReurDTTNDdinars?\s]', '', cleaned, flags=re.IGNORECASE)

    if re.fullmatch(r'\d{1,3}(?: \d{3})*,\d{3}', raw.strip()):
        cleaned = cleaned.replace(' ', '').replace(',', '.')
    elif ',' in cleaned and '.' in cleaned:
        cleaned = cleaned.replace('.', '').replace(',', '.')
    elif ',' in cleaned:
        parts = cleaned.split(',')
        if allow_three_decimals and len(parts) == 2 and len(parts[1]) == 3:
            cleaned = parts[0] + '.' + parts[1]
        else:
            cleaned = cleaned.replace(',', '.')

    cleaned = re.sub(r'[^\d.]', '', cleaned)
    if not cleaned:
        return None
    try:
        value = float(cleaned)
        return round(value, 3 if allow_three_decimals else 2) if value > 0 else None
    except ValueError:
        return None


def _is_max_limit_context(text: str, start: int, end: int) -> bool:
    window = text[max(0, start - 60): min(len(text), end + 60)].lower()
    markers = ('valeur maximale', 'maximale', 'ne depassant', 'certifies', 'certifiés', 'plafond')
    return any(m in window for m in markers)


def parse_amount(text: str) -> Optional[float]:
    currency_patterns = [
        r'([\d\s]+,\d{3})\s*(?:DT|TND|DINARS?)',
        r'([\d\s.,]+)\s*(?:DT|TND|DINARS?)',
        r'(?:montant|total|net\s+[àa]\s+payer|somme|pay[ée]|amount)\s*[:\-]?\s*([\d\s.,]+)\s*(?:€|eur|dt|tnd)?',
        r'([\d\s.,]{2,})\s*(?:€|eur)\b',
        r'(?:€|eur)\s*([\d\s.,]+)',
    ]

    candidates: list[tuple[float, int]] = []

    for pattern in currency_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            raw = match.group(1)
            if re.fullmatch(r'[\d\s]{15,}', raw.strip()):
                continue
            amount = _normalize_amount(raw, allow_three_decimals=True)
            if not amount or amount < 0.01 or amount > MAX_AMOUNT:
                continue
            if _is_max_limit_context(text, match.start(), match.end()):
                logger.debug('Skipping amount near max-limit disclaimer | raw=%s', raw)
                continue
            candidates.append((amount, match.start()))

    if candidates:
        candidates.sort(key=lambda item: (-item[0], item[1]))
        chosen = candidates[0][0]
        if chosen <= 30000 or not _is_max_limit_context(text, 0, len(text)):
            return chosen
        if len(candidates) > 1:
            return candidates[1][0]
        return None

    return None


def parse_reference(text: str) -> Optional[str]:
    upper = text.upper()

    patterns = [
        (r'(?:ORDRE\s+DE\s+PAIEMENT|L-?\s*CN)[^0-9]{0,20}(\d{10,14})', 'LCN'),
        (r'(?:CH[EÈQ][^\s]{0,4}|CH\s+\*)[^0-9]{0,25}(\d{5,10})', 'CHQ'),
        (r'(?:VIREMENT|VIR\.?)\s*(?:N[°O.]?\s*)?[:\-]?\s*([A-Z0-9][A-Z0-9\-/]{3,})', 'VIR'),
        (r'(?:N[°O.]\s*PI[EÈ]CE|R[EÉ]F[EÉ]RENCE|REF\.?)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/]{3,})', 'REF'),
        (r'\b((?:CHQ|VIR|TRT|LCN|REF)[\-/][A-Z0-9\-/]{3,})\b', 'CODE'),
        (r'\b(\d{2}\s+\d{3}\s+\d{5,}\s+\d{2}\s+\d{5}\s+\d\s+\d{2}\s+TND)\b', 'RIB'),
        (r'\b(\d{12,14})\b', 'NUM'),
    ]

    for pattern, kind in patterns:
        match = re.search(pattern, upper if kind != 'RIB' else text, re.IGNORECASE)
        if not match:
            continue
        ref = re.sub(r'\s+', '', match.group(1).upper().strip())
        if kind == 'CHQ':
            ref = f'CHQ-{ref}'
        elif kind == 'LCN':
            ref = f'LCN-{ref}'
        elif kind == 'RIB':
            ref = re.sub(r'\s+', ' ', match.group(1).strip())
        elif kind == 'NUM' and len(ref) < 10:
            continue
        if len(ref) >= 4:
            logger.debug('Reference matched | kind=%s value=%s', kind, ref)
            return ref

    return None


def _date_from_parts(day: str, month: str, year: str) -> Optional[str]:
    if len(year) == 2:
        year = f'20{year}'
    try:
        d, m, y = int(day), int(month), int(year)
        if 1 <= d <= 31 and 1 <= m <= 12 and 2000 <= y <= 2100:
            return f'{y:04d}-{m:02d}-{d:02d}'
    except ValueError:
        pass
    return None


def parse_issue_date(text: str) -> Optional[str]:
    patterns = [
        r'(?:date\s+de\s+cr[ée]ation|cr[ée][ée]\s+le)[^\d]{0,30}(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})',
        r'tunis[^|\n]{0,40}\|\s*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if not match:
            continue
        parts = re.split(r'[/\-.]', match.group(1))
        if len(parts) == 3:
            result = _date_from_parts(parts[0], parts[1], parts[2])
            if result:
                return result
    return None


def parse_date(text: str) -> Optional[str]:
    patterns = [
        r'\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b',
        r'\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})\b',
        r'\b(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})\b',
    ]

    found: list[str] = []
    for i, pattern in enumerate(patterns):
        for match in re.finditer(pattern, text):
            if i == 2:
                result = _date_from_parts(match.group(3), match.group(2), match.group(1))
            else:
                result = _date_from_parts(match.group(1), match.group(2), match.group(3))
            if result:
                found.append(result)

    if not found:
        return None
    return sorted(found)[-1]


def parse_method(text: str) -> Optional[str]:
    lower = text.lower()
    if re.search(r'lettre de change|bill of exchange|l-?\s*cn|lcn\b|traite|protestable', lower):
        return 'direct_debit'
    if re.search(r'ch[èe]?que|cheque|chq\b|payez contre ce', lower):
        return 'check'
    if re.search(r'virement|vir\.|transfer|wire', lower):
        return 'bank_transfer'
    if re.search(r'pr[ée]l[èe]vement|prelevement|sepa', lower):
        return 'direct_debit'
    if re.search(r'esp[èe]ces|cash\b', lower):
        return 'cash'
    return None


def parse_document_type(text: str) -> Optional[str]:
    lower = text.lower()
    if re.search(r'lettre de change|bill of exchange|l-?\s*cn', lower):
        return 'traite'
    if re.search(r'ch[èe]?que|payez contre ce', lower):
        return 'cheque'
    if re.search(r'virement', lower):
        return 'virement'
    return None


def parse_currency(text: str) -> Optional[str]:
    upper = text.upper()
    if re.search(r'\b(DT|TND|DINARS?)\b', upper):
        return 'TND'
    if re.search(r'\b(EUR|€)\b', upper):
        return 'EUR'
    return None


def _normalize_rib(raw: str) -> str:
    cleaned = re.sub(r'[^\d]', '', raw)
    return cleaned if len(cleaned) >= 18 else re.sub(r'\s+', ' ', raw.strip())


def format_rib_display(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    digits = re.sub(r'\D', '', raw)
    if len(digits) >= 20:
        return (
            f'{digits[0:2]} {digits[2:5]} {digits[5:10]} '
            f'{digits[10:12]} {digits[12:17]} {digits[17:18]} {digits[18:20]}'
        )
    return re.sub(r'\s+', ' ', raw.strip())


def parse_account_rib(text: str) -> Optional[str]:
    spaced = re.search(
        r'\b(\d{2}\s+\d{3}\s+\d{5,}\s+\d{2}\s+\d{5}\s+\d\s+\d{2}\s+TND)\b',
        text,
        re.IGNORECASE,
    )
    if spaced:
        return _normalize_rib(spaced.group(1))

    blocks = re.findall(r'\b\d{2}\b', text)
    pipe_blocks = re.search(r'(\d{2})\s*[|]\s*(\d{3})\s*[|]\s*(\d{5,})', text)
    if pipe_blocks:
        return ''.join(pipe_blocks.groups())

    compact = re.search(r'\b(\d{18,22})\b', text)
    if compact:
        return compact.group(1)
    return None


def parse_bank_name(text: str) -> Optional[str]:
    upper = text.upper()
    banks = (
        ('UIB', r'\bUIB\b|\bVIB\b|UNION INTERNATIONALE DE BANQUES|L\'UIB|FIXEE PAR L\'UIB'),
        ('BIAT', r'\bBIAT\b'),
        ('STB', r'\bSTB\b|SOCIETE TUNISIENNE DE BANQUE'),
        ('BNA', r'\bBNA\b|BANQUE NATIONALE AGRICOLE'),
        ('ATB', r'\bATB\b|ARAB TUNISIAN BANK'),
        ('BH', r'\bBH\b|BANQUE DE L\'HABITAT'),
        ('Amen Bank', r'\bAMEN BANK\b'),
        ('Attijari', r'\bATTIJARI\b'),
    )
    for label, pattern in banks:
        if re.search(pattern, upper):
            return label
    return None


def parse_bank_agency(text: str) -> Optional[str]:
    match = re.search(
        r'(?:payable\s+[àa]|domiciliation|agence\s+bancaire)\s*[:\-]?\s*([A-Z0-9][A-Za-z0-9\s,\.\-]{4,80})',
        text,
        re.IGNORECASE,
    )
    if match:
        value = match.group(1).strip()
        if len(value) >= 5:
            return value[:255]
    agency = re.search(r'\b(AGENCE\s+[UVI]IB)\b', text, re.IGNORECASE)
    if agency:
        return agency.group(1).strip().replace('VIB', 'UIB').replace('vib', 'UIB')
    payable = re.search(r'payable\s+[àa]\s*[:\-]?\s*([A-Z0-9][^\n]{4,60})', text, re.IGNORECASE)
    if payable:
        return payable.group(1).strip()[:255]
    return None


def parse_issuer_name(text: str) -> Optional[str]:
    tel_match = re.search(
        r'(?:TEL\s*:\s*[\d\s]+|TND)\s+([A-Z][A-Z\s\-]{4,50})',
        text,
        re.IGNORECASE,
    )
    if tel_match:
        name = re.sub(r'\s+', ' ', tel_match.group(1)).strip()
        name = re.split(r'\s+(?:VER|Aove|Msse|corethit|TAVUIB)', name, maxsplit=1)[0].strip()
        words = [w for w in name.split() if w.isalpha() and len(w) >= 2]
        if len(words) >= 2:
            return ' '.join(words[:4])[:255]

    patterns = [
        r'titulaire\s+du\s+compte\s*[:\-]?\s*([A-Z][A-Z\s\-]{4,60})',
        r'nom\s+(?:ou\s+raison\s+sociale\s+du\s+)?tireur\s*(?:\(vendeur\))?\s*[:\-]?\s*([A-Z][A-Za-z0-9\s\-]{4,80})',
        r'tireur\s*(?:\(vendeur\))?\s*[:\-]?\s*([A-Z][A-Za-z0-9\s\-]{4,80})',
        r'\b([A-Z]{2,}\s+[A-Z]{2,}\s+[A-Z]{2,})\b',
    ]
    skip = {'PAYEZ CONTRE CE', 'GROUPE SOCIETE', 'UNION INTERNATIONALE', 'NON ENDOSSABLE', 'ORDEE DE', 'PAIEMENT'}
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if not match:
            continue
        name = re.sub(r'\s+', ' ', match.group(1)).strip()
        if len(name) >= 4 and not any(s in name.upper() for s in skip):
            if name.lower() not in ('nom ou raison sociale', 'vendeur', 'lui m', 'lui meme'):
                return name[:255]
    return None


def parse_drawee_name(text: str) -> Optional[str]:
    match = re.search(
        r'nom\s+et\s+adresse\s+du\s+tir[ée]\s*(?:\(acheteur\))?\s*[:\-]?\s*([A-Z][A-Za-z0-9\s,\.\-]{4,80})',
        text,
        re.IGNORECASE,
    )
    if match:
        return re.sub(r'\s+', ' ', match.group(1)).strip()[:255]
    return None


def parse_traite_dates(text: str) -> tuple[Optional[str], Optional[str]]:
    row = re.search(
        r'tunis[^|\n]{0,40}\|\s*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4})\s*\|\s*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4})',
        text,
        re.IGNORECASE,
    )
    if row:
        p1 = re.split(r'[/\-.]', row.group(1))
        p2 = re.split(r'[/\-.]', row.group(2))
        if len(p1) == 3 and len(p2) == 3:
            return _date_from_parts(p1[0], p1[1], p1[2]), _date_from_parts(p2[0], p2[1], p2[2])

    found: list[str] = []
    for match in re.finditer(r'\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b', text):
        parsed = _date_from_parts(match.group(1), match.group(2), match.group(3))
        if parsed:
            found.append(parsed)
    if len(found) >= 2:
        found = sorted(set(found))
        return found[0], found[-1]
    return None, None


def parse_maturity_date(text: str) -> Optional[str]:
    due_match = re.search(
        r'[ée]ch[ée]ance[^\d]{0,40}(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})',
        text,
        re.IGNORECASE,
    )
    if not due_match:
        return None
    parts = re.split(r'[/\-.]', due_match.group(1))
    if len(parts) != 3:
        return None
    return _date_from_parts(parts[0], parts[1], parts[2])


def parse_payment_document(raw_text: str) -> ParsedPaymentDocument:
    normalized = normalize_ocr_text(raw_text)
    logger.debug('Normalized OCR text | preview="%s"', preview_text(normalized, 400))

    doc_type = parse_document_type(normalized)
    currency = parse_currency(normalized)
    amount = parse_amount(normalized)
    reference = parse_reference(normalized)
    maturity_date = parse_maturity_date(normalized)
    if doc_type == 'traite':
        issue, maturity = parse_traite_dates(normalized)
        date = issue or parse_issue_date(normalized) or parse_date(normalized)
        maturity_date = maturity or maturity_date
    else:
        date = parse_date(normalized)
    method = parse_method(normalized)
    bank_name = parse_bank_name(normalized)
    bank_agency = parse_bank_agency(normalized)
    issuer_name = parse_issuer_name(normalized)
    account_rib = parse_account_rib(normalized)
    drawee_name = parse_drawee_name(normalized) if doc_type == 'traite' else None

    if method is None and doc_type == 'cheque':
        method = 'check'
    if method is None and doc_type == 'traite':
        method = 'direct_debit'

    if doc_type == 'cheque' and amount is not None:
        if amount <= 30000 and re.search(r'maximale|maximale|ne depassant', normalized, re.I):
            amount = None

    if reference and doc_type == 'traite' and reference.isdigit():
        reference = f'LCN-{reference}'

    logger.info(
        'Field extraction | type=%s currency=%s amount=%s reference=%s date=%s maturity=%s method=%s rib=%s',
        doc_type,
        currency,
        amount,
        reference,
        date,
        maturity_date,
        method,
        account_rib,
    )

    if not any([amount, reference, date, method, account_rib, issuer_name, bank_name]):
        logger.warning('No fields extracted | preview="%s"', preview_text(normalized))

    return ParsedPaymentDocument(
        amount=amount,
        reference=reference,
        date=date,
        maturity_date=maturity_date,
        method=method,
        document_type=doc_type,
        currency=currency,
        bank_name=bank_name,
        bank_agency=bank_agency,
        issuer_name=issuer_name,
        account_rib=account_rib,
        drawee_name=drawee_name,
    )
