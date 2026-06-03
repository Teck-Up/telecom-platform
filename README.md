# TelecomPlatform — Gestion des Factures, Impayés & Recouvrement

Plateforme web complète pour opérateurs téléphoniques, couvrant la facturation, le suivi des paiements, le recouvrement et l'intelligence artificielle.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript + Tailwind CSS + Zustand |
| Backend | Node.js 20 + Express + MySQL 8 |
| Cache | Redis 7 |
| Queue | RabbitMQ 3 |
| IA | Python 3.11 + FastAPI + OpenAI / scikit-learn |
| Infra | Docker Compose |

## Lancement rapide

### Prérequis
- Docker Desktop installé et lancé
- Git

### 1. Cloner et configurer
```bash
git clone <repo>
cd telecom-platform
cp .env.example .env
# Optionnel : ajouter votre clé OpenAI dans .env pour activer le vrai chatbot GPT
```

### 2. Démarrer tous les services
```bash
docker compose up --build
```

L'application sera disponible sur :
- **Frontend** → http://localhost:3000
- **Backend API** → http://localhost:5000
- **AI Service** → http://localhost:8000
- **RabbitMQ Dashboard** → http://localhost:15672 (admin/admin)

### Développement local (sans Docker)

**Backend :**
```bash
cd backend
cp .env.example .env   # adapter les connexions
npm install
npm run dev
```

**Frontend :**
```bash
cd frontend
npm install
npm run dev
```

**AI Service :**
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Comptes de démonstration

Mot de passe par défaut : **Admin@123**

| Email | Rôle |
|-------|------|
| admin@telecom.fr | Administrateur |
| facturation@telecom.fr | Agent Facturation |
| recouvrement@telecom.fr | Agent Recouvrement |
| jean.dupont@example.com | Client |
| marie.martin@example.com | Cliente |

## Fonctionnalités

### Par rôle

**Administrateur**
- Tableau de bord global (CA, KPIs, graphiques)
- Gestion clients, utilisateurs
- Accès à toutes les fonctionnalités

**Agent Facturation**
- Création et gestion des factures
- Génération de PDF
- Enregistrement des paiements

**Agent Recouvrement**
- Dossiers de recouvrement
- Envoi de relances
- Suivi des impayés

**Client**
- Portail personnel : consultation et téléchargement des factures
- Notifications de relances
- Accès au chatbot IA

### Module IA
- **Chatbot** : répond en français, fonctionne en mode mock sans clé API, ou en mode GPT avec une clé OpenAI
- **Prédiction CA** : régression polynomiale sur l'historique des factures (endpoint `/predict`)

## Structure du projet

```
telecom-platform/
├── frontend/          React + TypeScript
│   └── src/
│       ├── pages/     LoginPage, Dashboard, Clients, Invoices, Payments, Recovery, Users, ClientPortal, Chatbot
│       ├── components/ Layout (sidebar)
│       ├── services/  api.ts (Axios)
│       └── store/     authStore.ts (Zustand)
├── backend/           Node.js + Express
│   └── src/
│       ├── routes/    auth, clients, invoices, payments, recovery, dashboard, notifications, users
│       ├── middleware/ auth.js (JWT)
│       └── models/    db.js (MySQL pool)
├── ai-service/        Python FastAPI
│   └── main.py        /chat + /predict endpoints
├── database/
│   └── init.sql       Schéma complet + données de démo
└── docker-compose.yml
```

## API Endpoints principaux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | /api/auth/login | Connexion |
| GET | /api/clients | Liste des clients |
| POST | /api/clients | Créer un client |
| GET | /api/invoices | Liste des factures |
| POST | /api/invoices | Créer une facture |
| GET | /api/invoices/:id/pdf | Télécharger le PDF |
| POST | /api/payments | Enregistrer un paiement |
| GET | /api/recovery | Dossiers de recouvrement |
| POST | /api/recovery/:id/reminders | Envoyer une relance |
| GET | /api/dashboard/stats | Statistiques globales |
| POST | /ai/chat | Chatbot IA |
| POST | /ai/predict | Prédiction CA |
