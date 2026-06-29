"""Manual checks for Gemini Text-to-SQL (requires GEMINI_API_KEY + MySQL)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()

from gemini_client import is_gemini_configured
from sql_validator import validate_readonly_sql
from text_to_sql import looks_like_analytical_question

VALIDATION_SAMPLES = [
    ('SELECT COUNT(*) FROM clients', True),
    ('```sql\nSELECT 1\n```', True),
    ('DELETE FROM invoices', False),
    ('SELECT * FROM invoices; DROP TABLE invoices', False),
]

QUESTIONS = [
    'Quelle est la dernière facture créée ?',
    'Combien de clients actifs on a ?',
    'Donne-moi le total des impayés',
    'Bonjour',
]

if __name__ == '__main__':
    print('Gemini configured:', is_gemini_configured())
    print('\nSQL validation')
    print('-' * 50)
    for sql, should_pass in VALIDATION_SAMPLES:
        try:
            validate_readonly_sql(sql)
            ok = should_pass
        except Exception:
            ok = not should_pass
        print(f"{'OK' if ok else 'FAIL'} | {sql[:60]}")

    print('\nAnalytical detection')
    print('-' * 50)
    for q in QUESTIONS:
        print(f"{looks_like_analytical_question(q)!s:5} | {q}")

    if not is_gemini_configured():
        print('\nSet GEMINI_API_KEY in .env to run live Text-to-SQL tests.')
        print('Get a free key: https://aistudio.google.com/app/apikey')
        sys.exit(0)

    from text_to_sql import answer_with_text_to_sql

    print('\nLive Text-to-SQL (Gemini)')
    print('-' * 50)
    for q in QUESTIONS:
        if not looks_like_analytical_question(q):
            continue
        print(f'\nQ: {q}')
        print(f'A: {answer_with_text_to_sql(q)}')
