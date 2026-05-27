// Modèle MongoDB pour les commandes
// Schema:
// - client (ref User)
// - restaurant (ref Restaurant)
// - articles: [{ menuItem (ref MenuItem), quantite, prix }]
// - total, frais de livraison
// - statut: 'en attente' | 'confirmee' | 'en preparation' | 'prete' | 'en livraison' | 'livree' | 'annulee'
// - adresse de livraison
// - livreur (ref User)
// - createdAt, updatedAt
