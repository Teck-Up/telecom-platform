import logging
import os


def setup_logging() -> None:
    level_name = os.getenv('LOG_LEVEL', 'INFO').upper()
    level = getattr(logging, level_name, logging.INFO)

    logging.basicConfig(
        level=level,
        format='%(asctime)s | %(levelname)-7s | %(name)s | %(message)s',
        datefmt='%H:%M:%S',
        force=True,
    )

    # Reduce noise from third-party libraries unless DEBUG
    if level > logging.DEBUG:
        logging.getLogger('httpx').setLevel(logging.WARNING)
        logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('PIL').setLevel(logging.WARNING)


def preview_text(text: str, max_len: int = 400) -> str:
    compact = ' '.join(text.split())
    if len(compact) <= max_len:
        return compact
    return f'{compact[:max_len]}…'
