const mongoose = require('mongoose');

/**
 * Modèle Delivery - Livraisons DashFood
 * Représente une livraison assignée à un livreur
 */
const deliverySchema = new mongoose.Schema({
    // Reference à la commande
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },

    // Informations client
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    clientName: {
        type: String,
        required: true
    },

    clientPhone: {
        type: String,
        required: true
    },

    clientAddress: {
        type: String,
        required: true
    },

    // Informations restaurant
    restaurantName: {
        type: String,
        required: true
    },

    restaurantAddress: {
        type: String,
        required: true
    },

    // Détails livraison
    distanceKm: {
        type: Number,
        required: true,
        min: 0
    },

    // Gain livreur : 10 MAD fixe + 1 MAD par km
    driverEarning: {
        type: Number,
        default: 0
    },

    // Livreur assigné
    assignedDriver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Statut de la livraison
    status: {
        type: String,
        enum: ['available', 'accepted', 'picked_up', 'on_the_way', 'delivered', 'cancelled'],
        default: 'available'
    },

    // Position actuelle du livreur
    currentPosition: {
        latitude: Number,
        longitude: Number
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },

    acceptedAt: Date,
    pickedUpAt: Date,
    onTheWayAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,

    // Raison annulation si applicable
    cancellationReason: String

}, {
    timestamps: true
});

// Index pour améliorer les performances
deliverySchema.index({ status: 1 });
deliverySchema.index({ assignedDriver: 1 });
deliverySchema.index({ createdAt: -1 });

/**
 * Calcule automatiquement le gain du livreur
 * Formule : 10 MAD fixe + 1 MAD par km
 */
deliverySchema.methods.calculateEarning = function() {
    this.driverEarning = 10 + this.distanceKm;
    return this.driverEarning;
};

/**
 * Middleware pre-save : calcule le gain avant sauvegarde
 */
deliverySchema.pre('save', function(next) {
    if (this.isNew || this.isModified('distanceKm')) {
        this.calculateEarning();
    }
    next();
});

/**
 * Met à jour le statut et enregistre le timestamp
 */
deliverySchema.methods.updateStatus = function(newStatus) {
    this.status = newStatus;

    // enregistre le timestamp selon le statut
    switch(newStatus) {
        case 'accepted':
            this.acceptedAt = new Date();
            break;
        case 'picked_up':
            this.pickedUpAt = new Date();
            break;
        case 'on_the_way':
            this.onTheWayAt = new Date();
            break;
        case 'delivered':
            this.deliveredAt = new Date();
            break;
        case 'cancelled':
            this.cancelledAt = new Date();
            break;
    }

    return this.save();
};

const Delivery = mongoose.model('Delivery', deliverySchema);

module.exports = Delivery;
