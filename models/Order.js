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

  // Articles commandés
  items: [{
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
    }
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

  // Statut de la commande
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered', 'cancelled'],
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
  estimatedDeliveryTime: {
    type: Date
  },

  // DashPoints
  dashPointsEarned: {
    type: Number,
    default: 0
  },

  // Dates et timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: {
    type: Date
  },
  preparingAt: {
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
  if (this.status === 'delivered') {
    this.dashPointsEarned = Math.floor(this.totalAmount);
  }
  return this.dashPointsEarned;
};

// Middleware pour mettre à jour les timestamps selon le statut
orderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'confirmed':
        if (!this.confirmedAt) this.confirmedAt = now;
        break;
      case 'preparing':
        if (!this.preparingAt) this.preparingAt = now;
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
