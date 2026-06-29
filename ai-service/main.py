# main.py

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.ai import router as ai_router
from config import Config

app = FastAPI(
    title="Telecom AI Service",
    description="Service IA pour la plateforme télécom (Chatbot + Prédictions)",
    version="1.0.0"
)

# Configuration CORS (pour autoriser Node.js et le Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure les routes IA
app.include_router(ai_router)

@app.get("/")
async def root():
    return {"status": "online", "message": "Telecom AI Service is running"}

if __name__ == "__main__":
    # Lancer le serveur sur le port configuré
    uvicorn.run("main:app", host="0.0.0.0", port=Config.PORT, reload=True)
