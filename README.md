# DashFood

Application de livraison de repas en ligne.

## Technologies

- **Backend** : Node.js + Express
- **Frontend** : HTML5, CSS3, JavaScript vanilla
- **Base de données** : MongoDB
- **Temps réel** : Socket.io

## Structure du projet

```
DASHFOOD/
├── data/              # Données de test
├── public/            # Fichiers statiques (CSS, JS, assets)
├── views/             # Pages HTML
├── routes/            # Routes Express
├── controllers/       # Contrôleurs
├── models/            # Modèles MongoDB
├── middleware/        # Middlewares
├── config/            # Configuration
├── socket/            # Gestion Socket.io
└── server.js          # Point d'entrée
```

## Installation

```bash
npm install
```

## Démarrage

```bash
npm run dev
```

Le serveur démarre sur http://localhost:3000

## Fonctionnalités prévues

- Catalogue de restaurants
- Commande en ligne
- Suivi en temps réel
- Gestion multi-rôles (Client, Restaurant, Livreur, Admin)
- Notifications temps réel

## Statut

Projet en cours de développement - Structure initiale créée.
