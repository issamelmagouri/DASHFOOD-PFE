const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Le nom complet est requis']
  },
  firstName: {
    type: String
  },
  lastName: {
    type: String
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Le numéro de téléphone est requis']
  },
  address: {
    type: String,
    required: [true, 'L\'adresse est requise']
  },
  city: {
    type: String
  },
  dateOfBirth: {
    type: Date
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis']
  },
  role: {
    type: String,
    enum: ['client', 'admin', 'restaurant', 'livreur'],
    default: 'client'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // preferences utilisateur
  preferences: {
    notifications: {
      type: Boolean,
      default: true
    },
    promotions: {
      type: Boolean,
      default: true
    },
    newsletter: {
      type: Boolean,
      default: false
    },
    analytics: {
      type: Boolean,
      default: true
    }
  },
  // Champs pour candidature livreur
  deliveryRequest: {
    type: Boolean,
    default: false
  },
  deliveryRequestStatus: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: null
  },
  deliveryInfo: {
    city: String,
    age: Number,
    transportType: String, // vélo, scooter, voiture
    experience: String, // oui, non
    availability: String, // temps plein, temps partiel, week-ends
    requestDate: {
      type: Date,
      default: Date.now
    }
  },

  // ===== SYSTÈME DASHPOINTS - PROGRAMME DE FIDÉLITÉ =====

  // Points actuels disponibles pour  echanger 
  // 1 MAD dépensé = 1 DashPoint gagné (après livraison)
  dashPoints: {
    type: Number,
    default: 0,
    min: 0
  },

  // Total de TOUS les points gagnés depuis la création du compte
  
  totalPointsEarned: {
    type: Number,
    default: 0,
    min: 0
  },

  // Niveau de fidélité du client
  // Bronze: 0-1999 | Silver: 2000-5999 | Gold: 6000-14999 | Platinum: 15000+
  loyaltyLevel: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
    default: 'Bronze'
  },

  // Historique complet des transactions de points
  pointsHistory: [{
    // Type de transaction : 'earned' (gagné) ou 'redeemed' (échangé)
    type: {
      type: String,
      enum: ['earned', 'redeemed'],
      required: true
    },
    // Montant de points (positif pour gagné, négatif pour échangé)
    amount: {
      type: Number,
      required: true
    },
    // Description de la transaction
    description: {
      type: String,
      required: true
    },
    // Référence à la commande (si applicable)
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    // Date de la transaction
    date: {
      type: Date,
      default: Date.now
    }
  }]
});

// ===== MÉTHODE : Calculer et mettre à jour le niveau de fidélité =====
// Appelée automatiquement après chaque ajout de points
userSchema.methods.updateLoyaltyLevel = function() {
  const total = this.totalPointsEarned;

  if (total >= 15000) {
    this.loyaltyLevel = 'Platinum';
  } else if (total >= 6000) {
    this.loyaltyLevel = 'Gold';
  } else if (total >= 2000) {
    this.loyaltyLevel = 'Silver';
  } else {
    this.loyaltyLevel = 'Bronze';
  }
};

//  MÉTHODE : Ajouter des DashPoints 
userSchema.methods.addDashPoints = function(amount, description, orderId = null) {
  // Ajouter les points disponibles
  this.dashPoints += amount;

  // Ajouter au total (ne diminue jamais)
  this.totalPointsEarned += amount;

  // Ajouter à l'historique
  this.pointsHistory.push({
    type: 'earned',
    amount: amount,
    description: description,
    orderId: orderId,
    date: new Date()
  });

  // Mettre à jour le niveau de fidélité
  this.updateLoyaltyLevel();
};

// ===== MÉTHODE : Échanger des DashPoints contre une récompense =====
userSchema.methods.redeemDashPoints = function(amount, description) {
  // Vérifier si l'utilisateur a assez de points
  if (this.dashPoints < amount) {
    throw new Error('Points insuffisants');
  }

  // Déduire les points disponibles
  this.dashPoints -= amount;

  // Ajouter à l'historique (montant négatif)
  this.pointsHistory.push({
    type: 'redeemed',
    amount: -amount,
    description: description,
    date: new Date()
  });
};

module.exports = mongoose.model('User', userSchema);
