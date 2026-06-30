import pandas as pd
from prophet import Prophet
from prophet.serialize import model_to_json, model_from_json
import os
import json


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_MODEL_PATH = os.path.join(BASE_DIR, "models", "prophet_model.json")

class RevenuePredictor:
    def __init__(self, model_path=DEFAULT_MODEL_PATH):
        """
        Initialise le prédicteur avec un chemin pour sauvegarder/charger le modèle.
        """
        self.model = None
        self.model_path = model_path


    def train_model(self, df: pd.DataFrame):
        """
        Entraîne le modèle Prophet sur les données historiques.
        Le DataFrame doit avoir les colonnes 'ds' (date) et 'y' (valeur).
        """
        print("⏳ Entraînement du modèle Prophet en cours...")

        # Configuration optimisée pour les données financières
        self.model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode='multiplicative'  # Idéal pour les revenus qui croissent avec le temps
        )

        self.model.fit(df)
        print("✅ Entraînement terminé avec succès.")
        self.save_model()

    def save_model(self):
        """Sauvegarde le 'cerveau' du modèle dans un fichier JSON."""
        if self.model:
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            with open(self.model_path, 'w') as fout:
                fout.write(model_to_json(self.model))
            print(f"💾 Modèle sauvegardé sur le disque : {self.model_path}")

    def load_model(self):
        """Charge le modèle depuis le disque s'il existe."""
        if os.path.exists(self.model_path):
            with open(self.model_path, 'r') as fin:
                self.model = model_from_json(fin.read())
            print(f"🧠 Modèle chargé depuis le disque : {self.model_path}")
            return True
        print("⚠️ Aucun modèle trouvé sur le disque. Un entraînement est nécessaire.")
        return False

    def predict(self, periods=30, granularity='day'):
        """
        Génère des prédictions pour le futur.
        - periods: nombre d'unités de temps à prédire
        - granularity: 'day', 'month' ou 'year'
        """
        # 1. Mapping des fréquences pour Facebook Prophet
        # 'D' = Day, 'MS' = Month Start, 'YS' = Year Start
        freq_map = {
            'day': 'D',
            'month': 'MS',
            'year': 'YS'
        }
        target_freq = freq_map.get(granularity, 'D')

        # 2. Vérification du modèle
        if not self.model:
            if not self.load_model():
                raise Exception("Le modèle n'est pas entraîné et aucun fichier de sauvegarde n'a été trouvé.")

        # 3. Création du DataFrame futur avec la bonne fréquence
        # On s'assure que periods est bien un entier
        future = self.model.make_future_dataframe(periods=int(periods), freq=target_freq)
        print("future=====> ",future)
        # 4. Calcul de la prédiction
        forecast = self.model.predict(future)

        # 5. Sélection des colonnes essentielles
        # ds: date, yhat: moyenne, yhat_lower/upper: intervalle de confiance
        result_df = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(int(periods))

        # 6. IMPORTANT : Conversion en format JSON (liste de dictionnaires)
        # Sans cela, FastAPI renvoie une erreur 500
        return result_df.to_dict(orient='records')


# Petit script de test interne
if __name__ == "__main__":
    # Ce bloc ne s'exécute que si tu lances le fichier directement
    print("Test du module Predictor...")
    predictor = RevenuePredictor()
    # Ici, on pourrait ajouter un test avec des données fictives
