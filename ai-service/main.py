import os
import httpx
import numpy as np
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="TelecomPlatform AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:5000")

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
    # If OpenAI key provided, use real GPT
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
        except Exception as e:
            # Fall through to mock if API fails
            pass

    # Mock chatbot responses (no API key needed)
    return {"response": get_mock_response(req.message)}


def get_mock_response(message: str) -> str:
    msg = message.lower()
    if any(w in msg for w in ['facture', 'invoice']):
        return "Vous pouvez consulter vos factures dans la section 'Factures' du menu. Chaque facture peut être téléchargée en PDF. Si vous avez des questions sur une facture spécifique, n'hésitez pas à me donner le numéro de facture."
    if any(w in msg for w in ['paiement', 'payer', 'pay']):
        return "Les paiements peuvent être effectués par virement bancaire, carte de crédit, chèque ou prélèvement automatique. Pour enregistrer un paiement, accédez à la section 'Paiements' et cliquez sur 'Enregistrer un paiement'."
    if any(w in msg for w in ['retard', 'impayé', 'relance']):
        return "En cas de retard de paiement, notre équipe de recouvrement vous contactera. Vous pouvez éviter les pénalités en régularisant votre situation dès que possible. Contactez-nous au +33 1 23 45 67 89 pour un arrangement."
    if any(w in msg for w in ['contact', 'support', 'aide', 'help']):
        return "Notre équipe support est disponible du lundi au vendredi de 8h à 18h. Vous pouvez nous contacter par email à support@telecom.fr ou par téléphone au +33 1 23 45 67 89."
    if any(w in msg for w in ['bonjour', 'salut', 'hello', 'bonsoir']):
        return "Bonjour ! Comment puis-je vous aider aujourd'hui ? Je suis là pour répondre à vos questions sur vos factures, paiements ou tout autre sujet lié à votre compte."
    return "Je comprends votre question. Pour vous donner une réponse précise, pourriez-vous me fournir plus de détails ? Vous pouvez également contacter directement notre équipe support à support@telecom.fr."


# ─── CA Prediction ──────────────────────────────────────────────────────────

class PredictionRequest(BaseModel):
    months_ahead: Optional[int] = 6
    historical_data: Optional[List[dict]] = None

@app.post("/predict")
async def predict_ca(req: PredictionRequest):
    """
    Predict CA for next N months using linear regression on historical data.
    If historical_data not provided, fetches from backend.
    """
    try:
        data = req.historical_data

        if not data:
            # Try to fetch from backend (won't have auth token, use mock data)
            data = generate_mock_data()

        if len(data) < 3:
            data = generate_mock_data()

        # Prepare time series
        values = [float(d.get('ca', d.get('amount', 0))) for d in data]
        n = len(values)
        X = np.array(range(n)).reshape(-1, 1)
        y = np.array(values)

        # Linear regression
        from sklearn.linear_model import LinearRegression
        from sklearn.preprocessing import PolynomialFeatures

        poly = PolynomialFeatures(degree=2)
        X_poly = poly.fit_transform(X)
        model = LinearRegression()
        model.fit(X_poly, y)

        # Predict future months
        future_X = np.array(range(n, n + req.months_ahead)).reshape(-1, 1)
        future_X_poly = poly.transform(future_X)
        predictions = model.predict(future_X_poly)

        # Generate month labels
        last_month = data[-1].get('month', datetime.now().strftime('%Y-%m'))
        year, month = map(int, last_month.split('-'))
        future_months = []
        for i in range(1, req.months_ahead + 1):
            month += 1
            if month > 12:
                month = 1
                year += 1
            future_months.append(f"{year}-{month:02d}")

        result = [
            {"month": m, "predicted_ca": max(0, round(float(p), 2))}
            for m, p in zip(future_months, predictions)
        ]

        # Calculate trend
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
        raise HTTPException(status_code=500, detail=str(e))


def generate_mock_data():
    """Generate realistic mock CA data for demo purposes."""
    base = 50000
    return [
        {"month": f"2024-{str(i).zfill(2)}", "ca": base + i * 2000 + np.random.randint(-3000, 3000)}
        for i in range(1, 13)
    ]


@app.get("/health")
def health():
    return {"status": "ok", "openai_configured": bool(OPENAI_API_KEY)}
