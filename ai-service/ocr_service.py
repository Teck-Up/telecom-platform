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
_APPLIED_TESSDATA_PREFIX: str | None = None

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


def _has_traineddata(directory: Path) -> bool:
    return directory.is_dir() and any(directory.glob('*.traineddata'))


def _sync_tessdata_to_runtime(source: Path) -> Path:
    """
    Copy language files to a short ASCII-only path on Windows.
    Avoids failures when the project lives under OneDrive folders with
    non-Latin characters (e.g. Arabic Desktop names).
    """
    if os.name != 'nt':
        return source

    runtime = Path(os.environ.get('LOCALAPPDATA', '')) / 'telecom-platform' / 'tessdata'
    runtime.mkdir(parents=True, exist_ok=True)

    for src in source.glob('*.traineddata'):
        dst = runtime / src.name
        if not dst.exists() or dst.stat().st_size != src.stat().st_size:
            shutil.copy2(src, dst)

    tesseract_cmd = resolve_tesseract_cmd()
    if tesseract_cmd:
        system = Path(tesseract_cmd).parent / 'tessdata'
        for name in ('eng.traineddata', 'osd.traineddata'):
            src = system / name
            dst = runtime / name
            if src.exists() and (not dst.exists() or dst.stat().st_size != src.stat().st_size):
                shutil.copy2(src, dst)

    return runtime


def resolve_tessdata_dir() -> Path | None:
    """Directory that directly contains *.traineddata files."""
    env_dir = os.getenv('TESSDATA_DIR')
    if env_dir:
        path = Path(env_dir)
        if _has_traineddata(path):
            return path.resolve()

    if _has_traineddata(LOCAL_TESSDATA):
        return _sync_tessdata_to_runtime(LOCAL_TESSDATA.resolve())

    tesseract_cmd = resolve_tesseract_cmd()
    if tesseract_cmd:
        system = Path(tesseract_cmd).parent / 'tessdata'
        if _has_traineddata(system):
            return system.resolve()

    return None


def apply_tessdata_env() -> Path | None:
    """
    Point TESSDATA_PREFIX at the folder that contains *.traineddata files.
    Using the env var avoids breaking paths that contain spaces on Windows.
    """
    global _APPLIED_TESSDATA_PREFIX

    tessdata_dir = resolve_tessdata_dir()
    if not tessdata_dir:
        return None

    prefix = str(tessdata_dir)
    if _APPLIED_TESSDATA_PREFIX != prefix:
        os.environ['TESSDATA_PREFIX'] = prefix
        _APPLIED_TESSDATA_PREFIX = prefix
        logger.info('TESSDATA_PREFIX set | tessdata=%s', tessdata_dir)

    return tessdata_dir


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
    _CONFIGURED_TESSDATA = apply_tessdata_env()
    logger.info(
        'Tesseract ready | path=%s tessdata=%s',
        _CONFIGURED_TESSERACT,
        _CONFIGURED_TESSDATA,
    )
except RuntimeError as exc:
    _CONFIGURED_TESSERACT = None
    _CONFIGURED_TESSDATA = None
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
    tessdata_dir = resolve_tessdata_dir()
    files = list(tessdata_dir.glob('*.traineddata')) if tessdata_dir else []
    codes = []
    for code in ('fra', 'eng'):
        if any(f.stem == code for f in files):
            codes.append(code)
    return '+'.join(codes) if codes else 'eng'


def _tesseract_config(psm: int = 6) -> str:
    # Do not pass --tessdata-dir here: unquoted paths with spaces break on Windows.
    # apply_tessdata_env() sets TESSDATA_PREFIX instead.
    return f'--psm {psm}'


def _run_ocr(processed: Image.Image, ocr_lang: str, psm: int) -> str:
    import pytesseract

    ensure_tesseract_configured()
    tessdata_dir = apply_tessdata_env()
    if not tessdata_dir:
        raise RuntimeError(
            'Aucun dossier tessdata trouvé. '
            'Placez eng.traineddata et fra.traineddata dans ai-service/tessdata/'
        )

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
