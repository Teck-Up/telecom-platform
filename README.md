# TelecomPlatform — Gestion des Factures, Impayés & Recouvrement

Plateforme web complète pour opérateurs téléphoniques : facturation, suivi des paiements, recouvrement et intelligence artificielle.

---

## ⚡ Lancement en 3 commandes

```bash
git clone https://github.com/YOUR_ORG/telecom-platform.git
cd telecom-platform
docker compose up --build
```

Ouvre http://localhost:3000 — c'est tout.

---

## Prérequis

- **Docker Desktop** installé et lancé — [Télécharger ici](https://www.docker.com/products/docker-desktop)
- Git

Pas besoin d'installer Node.js, Python, MySQL ou quoi que ce soit d'autre. Docker gère tout.

---

## Comptes de démonstration

Mot de passe universel : **Admin@123**

| Email | Rôle | Accès |
|-------|------|-------|
| admin@telecom.fr | Administrateur | Tout |
| facturation@telecom.fr | Agent Facturation | Factures, paiements, clients |
| recouvrement@telecom.fr | Agent Recouvrement | Recouvrement, relances |
| jean.dupont@example.com | Client | Portail client + chatbot |
| marie.martin@example.com | Cliente | Portail client + chatbot |

---

## URLs

| Service | URL |
|---------|-----|
| Application (frontend) | http://localhost:3000 |
| API backend | http://localhost:5001 |
| Service IA | http://localhost:8000 |
| RabbitMQ dashboard | http://localhost:15672 (admin / admin) |

---

## Activer le chatbot GPT (optionnel)

Par défaut le chatbot fonctionne en mode automatique sans clé API.
Pour activer GPT-3.5 :

1. Crée un fichier `.env` à la racine du projet :
```
OPENAI_API_KEY=sk-...
```
2. Relance : `docker compose up`

---

## Problèmes fréquents

**Port 5000 déjà utilisé (macOS)**
Le port 5000 est souvent pris par AirPlay sur Mac. Le projet utilise déjà le port 5001 pour éviter ça.

**Timeout au téléchargement des images Docker**
```bash
# Télécharge les images manuellement d'abord
docker pull node:20-alpine
docker pull python:3.11-slim
# Puis relance
docker compose up --build
```

**Réinitialiser la base de données**
```bash
docker compose down -v
docker compose up
```

**Docker daemon not running**
Ouvre Docker Desktop et attends que l'icône en bas à gauche soit verte avant de relancer.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript + Tailwind CSS + Zustand |
| Backend | Node.js 20 + Express + MySQL 8 |
| Cache | Redis 7 |
| Queue | RabbitMQ 3 |
| IA | Python 3.11 + FastAPI + OpenAI / scikit-learn |
| Infra | Docker Compose |

---

## Structure du projet

```
telecom-platform/
├── frontend/        React + TypeScript (port 3000)
├── backend/         Node.js + Express  (port 5000 interne / 5001 externe)
├── ai-service/      Python FastAPI      (port 8000)
├── database/        Schéma MySQL + données de démo
└── docker-compose.yml
```

---

## Fonctionnalités

- Authentification JWT avec 4 niveaux de rôles
- Gestion complète des clients et utilisateurs
- Création de factures avec lignes de détail et génération PDF
- Enregistrement des paiements (virement, carte, prélèvement...)
- Dossiers de recouvrement avec priorités et relances automatiques
- Tableau de bord avec graphiques CA mensuel sur 12 mois
- Portail client : consultation et téléchargement des factures
- Chatbot IA en français (mode mock ou GPT)
- Prédiction du chiffre d'affaires par régression polynomiale
- Notifications in-app en temps réel
