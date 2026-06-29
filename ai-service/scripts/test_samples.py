"""Test OCR extraction on sample documents in ai-service/."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from document_parser import parse_payment_document
from logging_config import setup_logging
from ocr_service import extract_text_from_image

SAMPLES = [
    'images.png',
    'Image-Lettre-de-change-traite-exemple.jpg',
]


def main() -> None:
    setup_logging()
    base = ROOT

    for name in SAMPLES:
        path = base / name
        if not path.exists():
            print(f'Missing: {path}')
            continue

        text = extract_text_from_image(path.read_bytes())
        parsed = parse_payment_document(text)

        print('=' * 60)
        print(name)
        print('-' * 60)
        print(text[:1200])
        print('-' * 60)
        print(parsed.to_response())
        print()


if __name__ == '__main__':
    main()
