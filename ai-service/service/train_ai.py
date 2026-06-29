import pandas as pd
from repositories.AnalyticsRepository import AnalyticsRepository
from models.predictor import RevenuePredictor


def run_training():
    print("🚀 Démarrage de l'entraînement de l'IA...")

    # 1. Récupérer les données de la VUE SQL
    repo = AnalyticsRepository()
    # On récupère tout l'historique par jour pour un entraînement précis
    data = repo.get_revenue_history(granularity='day')

    if not data:
        print("❌ Erreur : Aucune donnée trouvée dans la vue view_daily_revenue.")
        return

    # 2. Convertir en DataFrame Pandas (format attendu par Prophet)
    df = pd.DataFrame(data)
    # S'assurer que les colonnes sont bien nommées ds et y
    df = df.rename(columns={'period': 'ds', 'revenue': 'y'})
    df['ds'] = pd.to_datetime(df['ds'])

    # 3. Entraîner et Sauvegarder
    predictor = RevenuePredictor()
    predictor.train_model(df)

    print("✨ Félicitations ! Ton IA est maintenant entraînée et prête à prédire le futur.")


if __name__ == "__main__":
    run_training()
