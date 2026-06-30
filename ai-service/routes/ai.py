from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from models.chatbot import TelecomChatbot
from models.predictor import RevenuePredictor
from repositories.AnalyticsRepository import AnalyticsRepository
import pandas as pd
import os
from dotenv import load_dotenv

# Charger les variables d'environnement du fichier .env
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

router = APIRouter(prefix="/api/ai", tags=["AI"])

# Initialisation des composants
chatbot = TelecomChatbot(GROQ_API_KEY)
analytics_repo = AnalyticsRepository()
predictor = RevenuePredictor()


# --- Modèles de données pour Swagger ---
class ChatRequest(BaseModel):
    query: str
    context_data: Optional[Dict[str, Any]] = None


class PredictionRequest(BaseModel):
    periods: int = 30
    granularity: str = "day"  # "day" ou "month"


# --- Endpoints Chatbot ---
@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Discuter avec l'assistant (Analyse SQL + NLP)"""
    try:
        response = await chatbot.get_response(request.query, request.context_data)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/clear")
async def clear_chat_history():
    """Réinitialiser la mémoire du chatbot"""
    chatbot.clear_memory()
    return {"message": "Mémoire effacée"}


# --- Endpoints Prédictions (IA) ---
@router.post("/predict")
async def predict_revenue(request: Request):
    try:
        # 1. On récupère les données JSON envoyées par React
        data = await request.json()
        periods = data.get('periods', 30)
        granularity = data.get('granularity', 'day')

        # 2. On appelle notre méthode "intelligente" dans predictor.py
        # Elle gère déjà la fréquence (D, MS, YS) et le format JSON
        predictions = predictor.predict(periods=periods, granularity=granularity)

        # 3. On renvoie le résultat au format attendu par ton Frontend
        return {
            "status": "success",
            "granularity": granularity,
            "data": predictions
        }

    except Exception as e:
        # Si une erreur survient (ex: modèle non trouvé), on renvoie une erreur 500 propre
        print(f"ERREUR PREDICTION: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train")
async def train_ai_model():
    """Bouton 'Recalculer' : Ré-entraîne l'IA sur les dernières données"""
    try:
        data = analytics_repo.get_revenue_history(granularity='day')
        df = pd.DataFrame(data).rename(columns={'ds': 'ds', 'revenue': 'y'})
        df['ds'] = pd.to_datetime(df['ds'])

        predictor.train_model(df)
        return {"status": "success", "message": "IA ré-entraînée avec succès"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Endpoints Dashboard (Direct) ---
@router.get("/dashboard/summary")
async def get_dashboard_summary():
    """Statistiques clés pour le dashboard principal"""
    return analytics_repo.get_dashboard_summary()


@router.get("/dashboard/revenue-history")
async def get_revenue_history(granularity: str = "day", start_date: str = None, end_date: str = None):
    """Historique des revenus pour les graphiques"""
    return analytics_repo.get_revenue_history(start_date, end_date, granularity)

@router.get("/dashboard/invoice-distribution")
async def get_invoice_distribution( start_date: str, end_date: str):
    return analytics_repo.get_invoice_distribution(start_date, end_date)
