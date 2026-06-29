import os
import random
import logging
from datetime import datetime
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

from document_parser import ParsedPaymentDocument, parse_payment_document
from gemini_client import is_gemini_configured
from gemini_vision import analyze_payment_image
from ocr_service import extract_text_from_image
from logging_config import setup_logging, preview_text
from chat_intents import HELP_MENU, try_analytical_response
from db import ping_db
from text_to_sql import ANALYTICS_ERROR, answer_with_text_to_sql, looks_like_analytical_question

load_dotenv()
setup_logging()

logger = logging.getLogger('telecom.api')

app = FastAPI(title="TelecomPlatform AI Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")
PAYMENT_OCR_ENGINE = os.getenv("PAYMENT_OCR_ENGINE", "auto").lower()
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:5000")
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

# ─── Chatbot ────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

SYSTEM_PROMPT = """Tu es un assistant intelligent pour TelecomPlatform, une plateforme de gestion des factures et du recouvrement pour opérateurs téléphoniques.

Tu peux aider avec :
- Questions sur les factures et paiements
- Procédures de recouvrement
- Informations sur les délais de paiement
- Support client général
- Navigation dans la plateforme

Réponds toujours en français, de manière claire et professionnelle.
Si tu ne sais pas quelque chose, dis-le honnêtement et propose de contacter le support."""

@app.post("/chat")
async def chat(req: ChatRequest):
    if is_gemini_configured() and looks_like_analytical_question(req.message):
        text_to_sql_answer = answer_with_text_to_sql(req.message)
        if text_to_sql_answer:
            return {"response": text_to_sql_answer}

    analytical = try_analytical_response(req.message)
    if analytical:
        return {"response": analytical}

    if is_gemini_configured() and looks_like_analytical_question(req.message):
        return {"response": ANALYTICS_ERROR}

    if OPENAI_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_API_KEY)
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            for h in (req.history or []):
                messages.append({"role": h.role, "content": h.content})
            messages.append({"role": "user", "content": req.message})

            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=500,
                temperature=0.7,
            )
            return {"response": response.choices[0].message.content}
        except Exception:
            pass

    return {"response": get_mock_response(req.message)}


def get_mock_response(message: str) -> str:
    msg = message.lower()
    if any(w in msg for w in ['aide', 'help', 'menu', 'que peux', 'quoi faire', 'comment utiliser']):
        return HELP_MENU
    if any(w in msg for w in ['facture', 'invoice']):
        return "Vous pouvez consulter vos factures dans la section 'Factures' du menu. Chaque facture peut être téléchargée en PDF. Si vous avez des questions sur une facture spécifique, n'hésitez pas à me donner le numéro de facture."
    if any(w in msg for w in ['paiement', 'payer', 'pay']):
        return "Les paiements peuvent être effectués par virement bancaire, carte de crédit, chèque ou prélèvement automatique. Pour enregistrer un paiement, accédez à la section 'Paiements' et cliquez sur 'Enregistrer un paiement'."
    if any(w in msg for w in ['retard', 'impayé', 'relance']):
        return "En cas de retard de paiement, notre équipe de recouvrement vous contactera. Vous pouvez éviter les pénalités en régularisant votre situation dès que possible. Contactez-nous au +33 1 23 45 67 89 pour un arrangement."
    if any(w in msg for w in ['contact', 'support']):
        return "Notre équipe support est disponible du lundi au vendredi de 8h à 18h. Vous pouvez nous contacter par email à support@telecom.fr ou par téléphone au +33 1 23 45 67 89."
    if any(w in msg for w in ['bonjour', 'salut', 'hello', 'bonsoir']):
        return f"Bonjour ! Comment puis-je vous aider aujourd'hui ?\n\n{HELP_MENU}"
    return (
        "Je comprends votre question. Pour une réponse précise, précisez votre demande "
        "ou consultez le menu d'aide ci-dessous.\n\n" + HELP_MENU
    )


# ─── Payment document OCR ───────────────────────────────────────────────────

def _payment_scan_engine() -> str:
    engine = PAYMENT_OCR_ENGINE
    if engine not in ('auto', 'gemini', 'tesseract'):
        return 'auto'
    return engine


def _finalize_payment_scan(parsed: ParsedPaymentDocument, source: str) -> dict:
    result = parsed.to_response()
    logger.info('Parsed payment fields (%s) | %s', source, result)

    if not any([
        parsed.amount,
        parsed.reference,
        parsed.date,
        parsed.maturity_date,
        parsed.method,
        parsed.account_rib,
        parsed.issuer_name,
        parsed.bank_name,
    ]):
        logger.warning(
            'No payment fields matched (%s) | amount=%s reference=%s date=%s method=%s',
            source,
            parsed.amount,
            parsed.reference,
            parsed.date,
            parsed.method,
        )
        raise HTTPException(
            status_code=422,
            detail="Aucune information de paiement n'a pu être extraite du document",
        )

    logger.info(
        'Payment scan success (%s) | amount=%s reference=%s method=%s',
        source,
        parsed.amount,
        parsed.reference,
        parsed.method,
    )
    return result


def _scan_with_gemini(image_bytes: bytes, content_type: str) -> ParsedPaymentDocument:
    return analyze_payment_image(image_bytes, content_type)


def _scan_with_tesseract(image_bytes: bytes) -> ParsedPaymentDocument:
    raw_text = extract_text_from_image(image_bytes)
    text_len = len(raw_text.strip())
    logger.info('OCR raw text | chars=%d preview="%s"', text_len, preview_text(raw_text))

    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="Aucun texte détecté sur le document")

    return parse_payment_document(raw_text)


@app.post("/api/payments/analyze-document")
async def analyze_payment_document(file: UploadFile = File(...)):
    logger.info(
        'OCR request received | filename=%s content_type=%s engine=%s',
        file.filename,
        file.content_type,
        _payment_scan_engine(),
    )

    if not file.content_type or not file.content_type.startswith('image/'):
        logger.warning('Rejected upload: invalid content type %s', file.content_type)
        raise HTTPException(status_code=400, detail="Le fichier doit être une image (JPEG, PNG, etc.)")

    image_bytes = await file.read()
    logger.info('Image loaded | size_bytes=%d', len(image_bytes))

    if not image_bytes:
        logger.warning('Rejected upload: empty file')
        raise HTTPException(status_code=400, detail="Fichier vide")
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        logger.warning('Rejected upload: file too large (%d bytes)', len(image_bytes))
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10 Mo)")

    engine = _payment_scan_engine()
    content_type = file.content_type or 'image/jpeg'

    if engine == 'gemini':
        if not is_gemini_configured():
            raise HTTPException(status_code=503, detail="Gemini n'est pas configuré (GEMINI_API_KEY manquant)")
        try:
            parsed = _scan_with_gemini(image_bytes, content_type)
            return _finalize_payment_scan(parsed, 'gemini')
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception('Gemini vision scan failed | error=%s', exc)
            raise HTTPException(status_code=422, detail=f"Analyse Gemini impossible : {exc}") from exc

    if engine == 'auto' and is_gemini_configured():
        try:
            parsed = _scan_with_gemini(image_bytes, content_type)
            return _finalize_payment_scan(parsed, 'gemini')
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning('Gemini vision failed, falling back to Tesseract | error=%s', exc)

    try:
        parsed = _scan_with_tesseract(image_bytes)
        return _finalize_payment_scan(parsed, 'tesseract')
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception('OCR extraction failed | error=%s', exc)
        raise HTTPException(
            status_code=422,
            detail=f"Impossible d'analyser l'image. Vérifiez que Tesseract OCR est installé. ({exc})",
        ) from exc

# ─── CA Prediction ──────────────────────────────────────────────────────────

class PredictionRequest(BaseModel):
    months_ahead: Optional[int] = 6
    historical_data: Optional[List[dict]] = None

@app.post("/predict")
async def predict_ca(req: PredictionRequest):
    try:
        import numpy as np
        from sklearn.linear_model import LinearRegression
        from sklearn.preprocessing import PolynomialFeatures

        data = req.historical_data
        if not data:
            data = generate_mock_data()

        if len(data) < 3:
            data = generate_mock_data()

        values = [float(d.get('ca', d.get('amount', 0))) for d in data]
        n = len(values)
        X = np.array(range(n)).reshape(-1, 1)
        y = np.array(values)

        poly = PolynomialFeatures(degree=2)
        X_poly = poly.fit_transform(X)
        model = LinearRegression()
        model.fit(X_poly, y)

        future_X = np.array(range(n, n + req.months_ahead)).reshape(-1, 1)
        future_X_poly = poly.transform(future_X)
        predictions = model.predict(future_X_poly)

        last_month = data[-1].get('month', datetime.now().strftime('%Y-%m'))
        year, month = map(int, last_month.split('-'))
        future_months = []
        for _ in range(req.months_ahead):
            month += 1
            if month > 12:
                month = 1
                year += 1
            future_months.append(f"{year}-{month:02d}")

        result = [
            {"month": m, "predicted_ca": max(0, round(float(p), 2))}
            for m, p in zip(future_months, predictions)
        ]

        avg_historical = np.mean(values[-3:]) if len(values) >= 3 else np.mean(values)
        avg_predicted = np.mean(predictions)
        trend = "hausse" if avg_predicted > avg_historical else "baisse"
        trend_pct = abs((avg_predicted - avg_historical) / avg_historical * 100) if avg_historical else 0

        return {
            "predictions": result,
            "trend": trend,
            "trend_percentage": round(trend_pct, 1),
            "model": "polynomial_regression",
            "historical_points": n,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


def generate_mock_data():
    base = 50000
    return [
        {"month": f"2024-{str(i).zfill(2)}", "ca": base + i * 2000 + random.randint(-3000, 3000)}
        for i in range(1, 13)
    ]

@app.get("/health")
def health():
    from ocr_service import _CONFIGURED_TESSERACT
    from gemini_client import get_model
    return {
        "status": "ok",
        "openai_configured": bool(OPENAI_API_KEY),
        "gemini_configured": is_gemini_configured(),
        "gemini_model": get_model() if is_gemini_configured() else None,
        "payment_ocr_engine": _payment_scan_engine(),
        "database_connected": ping_db(),
        "tesseract_configured": bool(_CONFIGURED_TESSERACT),
        "tesseract_path": _CONFIGURED_TESSERACT,
    }