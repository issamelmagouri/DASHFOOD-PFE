// Modèle MongoDB pour les livraisons
// Schema:
// - commande (ref Order)
// - livreur (ref User)
// - statut: 'assignee' | 'en cours' | 'livree'
// - position actuelle: { latitude, longitude }
// - heure de depart, heure d'arrivee estimee, heure d'arrivee reelle
// - createdAt, updatedAt
