const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Références
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  },
  restaurantName: {
    type: String,
    required: true
  },

  // Informations client
  clientName: {
    type: String,
    required: true
  },
  clientPhone: {
    type: String,
    required: true
  },

  // Articles commandés
  items: [{
    menuItem: mongoose.Schema.Types.ObjectId,
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    image: String
  }],

  // Montants
  totalAmount: {
    type: Number,
    required: true
  },
  deliveryFee: {
    type: Number,
    default: 10
  },
  subtotal: { type: Number, min: 0 },
  total: { type: Number, min: 0 },
  paymentMethod: {
    type: String,
    enum: ['cash_on_delivery', 'card'],
    default: 'cash_on_delivery'
  },

  // Statut de la commande
  status: {
    type: String,
    enum: ['pending', 'accepted', 'preparing', 'ready_for_delivery', 'assigned_to_driver', 'on_the_way', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'accepted', 'picked_up', 'on_the_way', 'delivered', 'cancelled'],
    default: 'pending'
  },

  // Informations de livraison
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  driverName: {
    type: String
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  deliveryCoordinates: {
    latitude: Number,
    longitude: Number
  },
  estimatedDeliveryTime: {
    type: Date
  },
  tracking: {
    courierLocation: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      updatedAt: Date
    },
    clientLocation: {
      latitude: Number,
      longitude: Number
    },
    distanceKm: { type: Number, min: 0 },
    etaMinutes: { type: Number, min: 0 },
    routeGeometry: {
      type: { type: String, enum: ['LineString'], default: 'LineString' },
      coordinates: [[Number]]
    },
    routeSource: { type: String, enum: ['openrouteservice', 'fallback'] },
    lastStatusUpdate: Date
  },

  // DashPoints
  dashPointsEarned: {
    type: Number,
    default: 0
  },
  sourceType: {
    type: String,
    enum: ['normal', 'food_party'],
    default: 'normal'
  },
  foodParty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodParty'
  },
  dashPointsEligible: {
    type: Boolean,
    default: true
  },
  dashPointsAwarded: {
    type: Boolean,
    default: false
  },
  dashPointsAwardedAt: Date,

  // Dates et timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date
  },
  confirmedAt: {
    type: Date
  },
  preparingAt: {
    type: Date
  },
  readyAt: {
    type: Date
  },
  onTheWayAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },

  // Notes et raisons
  notes: {
    type: String
  },
  cancellationReason: {
    type: String
  }
});

// Méthode pour calculer les DashPoints (1 MAD = 1 point)
orderSchema.methods.calculateDashPoints = function() {
  if (this.status === 'delivered' && this.dashPointsEligible !== false) {
    this.dashPointsEarned = Math.floor(this.totalAmount);
  }
  return this.dashPointsEarned;
};

// Middleware pour mettre à jour les timestamps selon le statut
orderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'accepted':
        if (!this.acceptedAt) this.acceptedAt = now;
        break;
      case 'confirmed':
        if (!this.confirmedAt) this.confirmedAt = now;
        break;
      case 'preparing':
        if (!this.preparingAt) this.preparingAt = now;
        break;
      case 'ready_for_delivery':
        if (!this.readyAt) this.readyAt = now;
        break;
      case 'on_the_way':
        if (!this.onTheWayAt) this.onTheWayAt = now;
        break;
      case 'delivered':
        if (!this.deliveredAt) this.deliveredAt = now;
        this.calculateDashPoints();
        break;
      case 'cancelled':
        if (!this.cancelledAt) this.cancelledAt = now;
        break;
    }
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
