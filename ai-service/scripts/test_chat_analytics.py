"""Quick checks for chat analytics intent detection and DB queries."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from chat_intents import detect_analytical_intent, try_analytical_response

SAMPLES = [
    ('quel est le client de la dernière facture', 'LAST_INVOICE_CLIENT'),
    ('client de la dernière facture créée', 'LAST_INVOICE_CLIENT'),
    ('dernière facture créée', 'LAST_INVOICE'),
    ('quelle est la dernière facture', 'LAST_INVOICE'),
    ('combien on a facturé aujourd\'hui', 'TOTAL_INVOICES_TODAY'),
    ('chiffre du jour', 'TOTAL_INVOICES_TODAY'),
    ('combien de clients actifs', 'CLIENT_COUNT'),
    ('nombre de clients', 'CLIENT_COUNT'),
    ('quel est le montant des impayés', 'OVERDUE_TOTAL'),
    ('total impayés', 'OVERDUE_TOTAL'),
    ('comment payer ma facture', None),
]

if __name__ == '__main__':
    print('Intent detection')
    print('-' * 60)
    for message, expected in SAMPLES:
        detected = detect_analytical_intent(message)
        status = 'OK' if detected == expected else 'FAIL'
        print(f'{status} | {message!r} -> {detected} (expected {expected})')

    print('\nLive responses')
    print('-' * 60)
    for message, expected in SAMPLES:
        if not expected:
            continue
        response = try_analytical_response(message)
        print(f'\nQ: {message}')
        print(f'A: {response}')
