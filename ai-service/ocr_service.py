import io
import logging
import os
import shutil
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps

logger = logging.getLogger('telecom.ocr')
OCR_ENGINE = os.getenv('OCR_ENGINE', 'pytesseract')

BASE_DIR = Path(__file__).resolve().parent
LOCAL_TESSDATA = BASE_DIR / 'tessdata'

WINDOWS_TESSERACT_PATHS = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    r'C:\Users\nikol\AppData\Local\Programs\Tesseract-OCR\tesseract.exe',
]


def resolve_tesseract_cmd() -> str | None:
    env_cmd = os.getenv('TESSERACT_CMD')
    if env_cmd and Path(env_cmd).exists():
        return env_cmd

    found = shutil.which('tesseract')
    if found:
        return found

    for candidate in WINDOWS_TESSERACT_PATHS:
        if Path(candidate).exists():
            return candidate

    return None


def ensure_tesseract_configured() -> str:
    import pytesseract

    tesseract_cmd = resolve_tesseract_cmd()
    if not tesseract_cmd:
        raise RuntimeError(
            "Tesseract OCR introuvable. Installez-le depuis "
            "https://github.com/UB-Mannheim/tesseract/wiki "
            "ou définissez TESSERACT_CMD dans ai-service/.env"
        )

    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    return tesseract_cmd


try:
    _CONFIGURED_TESSERACT = ensure_tesseract_configured()
    logger.info('Tesseract ready | path=%s tessdata=%s', _CONFIGURED_TESSERACT, LOCAL_TESSDATA)
except RuntimeError as exc:
    _CONFIGURED_TESSERACT = None
    logger.error('Tesseract not configured at startup | %s', exc)


def _preprocess_image(image: Image.Image) -> Image.Image:
    img = image.convert('L')
    img = ImageOps.autocontrast(img)
    img = ImageEnhance.Sharpness(img).enhance(1.5)

    width, height = img.size
    min_dim = 1500
    if max(width, height) < min_dim:
        scale = min_dim / max(width, height)
        img = img.resize((int(width * scale), int(height * scale)), Image.Resampling.LANCZOS)

    return img


def _available_ocr_langs() -> str:
    files = list(LOCAL_TESSDATA.glob('*.traineddata')) if LOCAL_TESSDATA.exists() else []
    codes = []
    for code in ('fra', 'eng'):
        if any(f.stem == code for f in files):
            codes.append(code)
    return '+'.join(codes) if codes else 'eng'


def _tesseract_config(psm: int = 6) -> str:
    parts = [f'--psm {psm}']
    if LOCAL_TESSDATA.exists() and list(LOCAL_TESSDATA.glob('*.traineddata')):
        parts.insert(0, f'--tessdata-dir {LOCAL_TESSDATA}')
    return ' '.join(parts)


def _run_ocr(processed: Image.Image, ocr_lang: str, psm: int) -> str:
    import pytesseract

    ensure_tesseract_configured()
    config = _tesseract_config(psm)
    return pytesseract.image_to_string(processed, lang=ocr_lang, config=config)


def _extract_with_pytesseract(image: Image.Image) -> str:
    processed = _preprocess_image(image)
    ocr_lang = _available_ocr_langs()

    logger.info(
        'Running Tesseract | lang=%s processed_size=%sx%s',
        ocr_lang,
        processed.width,
        processed.height,
    )

    chunks = [
        _run_ocr(processed, ocr_lang, 6),
        _run_ocr(processed, ocr_lang, 4),
    ]
    merged = '\n'.join(
        dict.fromkeys(line.strip() for chunk in chunks for line in chunk.splitlines() if line.strip())
    )
    logger.info('Tesseract finished | chars=%d lines=%d', len(merged), merged.count('\n') + 1)
    return merged


def _extract_with_easyocr(image: Image.Image) -> str:
    import easyocr
    import numpy as np

    reader = easyocr.Reader(['fr', 'en'], gpu=False)
    results = reader.readtext(np.array(image), detail=0, paragraph=True)
    return '\n'.join(results)


def extract_text_from_image(image_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(image_bytes))
    logger.info(
        'Image opened | format=%s mode=%s size=%sx%s bytes=%d',
        image.format,
        image.mode,
        image.width,
        image.height,
        len(image_bytes),
    )

    if image.mode not in ('RGB', 'L'):
        image = image.convert('RGB')

    if OCR_ENGINE == 'easyocr':
        return _extract_with_easyocr(image)
    return _extract_with_pytesseract(image)
