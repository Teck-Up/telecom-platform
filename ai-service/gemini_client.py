import json
import logging
import os
import time
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

logger = logging.getLogger('telecom.gemini')

DEFAULT_MODEL = 'gemini-2.0-flash'
FALLBACK_MODELS = (
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite',
)

_client = None


def _api_key() -> str:
    return (
        os.getenv('GEMINI_API_KEY', '').strip()
        or os.getenv('GOOGLE_API_KEY', '').strip()
    )


def is_gemini_configured() -> bool:
    return bool(_api_key())


def get_model() -> str:
    return os.getenv('GEMINI_MODEL', DEFAULT_MODEL)


def get_client():
    global _client
    if _client is None:
        api_key = _api_key()
        if not api_key:
            raise RuntimeError('GEMINI_API_KEY is not configured')
        from google import genai

        _client = genai.Client(api_key=api_key)
    return _client


def _model_candidates(preferred: Optional[str] = None) -> list[str]:
    models: list[str] = []
    if preferred:
        models.append(preferred)
    env_model = get_model()
    if env_model not in models:
        models.append(env_model)
    for model in FALLBACK_MODELS:
        if model not in models:
            models.append(model)
    return models


def _messages_to_prompt(messages: list[dict[str, str]]) -> tuple[Optional[str], str]:
    system_parts = [m['content'] for m in messages if m.get('role') == 'system']
    user_parts = [m['content'] for m in messages if m.get('role') == 'user']
    if not user_parts:
        raise ValueError('At least one user message is required')
    system_instruction = '\n\n'.join(system_parts) if system_parts else None
    return system_instruction, user_parts[-1]


def chat_completion(
    messages: list[dict[str, str]],
    *,
    model: Optional[str] = None,
    max_tokens: int = 600,
    temperature: float = 0.1,
) -> str:
    from google.genai import types

    client = get_client()
    system_instruction, user_content = _messages_to_prompt(messages)
    last_error: Optional[Exception] = None

    for candidate in _model_candidates(model):
        for attempt in range(2):
            try:
                logger.debug('Gemini request | model=%s attempt=%d', candidate, attempt + 1)
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                )
                response = client.models.generate_content(
                    model=candidate,
                    contents=user_content,
                    config=config,
                )
                text = (response.text or '').strip()
                if text:
                    return text
                last_error = RuntimeError('Gemini returned an empty response')
            except Exception as exc:
                last_error = exc
                if attempt == 0 and any(code in str(exc) for code in ('429', '503', 'RESOURCE_EXHAUSTED')):
                    time.sleep(2)
                    continue
                logger.warning('Gemini model failed | model=%s error=%s', candidate, exc)
                break

    if last_error:
        raise last_error
    raise RuntimeError('Gemini request failed')


def json_dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, default=_json_default)


def _json_default(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)
