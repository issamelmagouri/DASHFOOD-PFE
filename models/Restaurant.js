const mongoose = require('mongoose');

/**
 * Modèle Restaurant - DashFood
 * Représente un restaurant partenaire avec toutes ses informations
 */
const restaurantSchema = new mongoose.Schema({
    // Informations de base
    name: {
        type: String,
        required: [true, 'Le nom du restaurant est requis'],
        trim: true,
        minlength: [2, 'Le nom doit contenir au moins 2 caractères'],
        maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
    },

    cuisineType: {
        type: String,
        required: [true, 'Le type de cuisine est requis'],
        trim: true
    },

    cuisine: {
        type: String,
        trim: true
    },

    category: {
        type: String,
        required: [true, 'La catégorie est requise'],
        enum: ['Pizza', 'Burgers', 'Sushi', 'Marocain', 'Italien', 'Healthy', 'Café', 'Desserts', 'Asiatique', 'Français', 'Street Food'],
        default: 'Français'
    },

    // Localisation
    city: {
        type: String,
        required: [true, 'La ville est requise'],
        trim: true
    },

    address: {
        type: String,
        required: [true, 'L\'adresse est requise'],
        trim: true
    },

    coordinates: {
        latitude: { type: Number },
        longitude: { type: Number }
    },

    // Informations descriptives
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
    },

    // Médias
    image: {
        type: String,
        default: '/assets/restaurants/placeholder.jpg'
    },

    logo: {
        type: String,
        default: '/assets/restaurants/logo-placeholder.jpg'
    },

    // Évaluations et popularité
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },

    reviewCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // Livraison
    deliveryTime: {
        type: String,
        default: '30-45 min'
    },

    deliveryFee: {
        type: Number,
        default: 0,
        min: 0
    },

    freeDelivery: {
        type: Boolean,
        default: false
    },

    // Statuts et tags
    isPopular: {
        type: Boolean,
        default: false
    },

    isFeatured: {
        type: Boolean,
        default: false
    },

    isActive: {
        type: Boolean,
        default: true
    },

    isOpen: {
        type: Boolean,
        default: true
    },

    // Menu
    menuItems: [{
        name: { type: String, required: true },
        description: String,
        price: { type: Number, required: true },
        category: String,
        image: String,
        badge: {
            type: String,
            enum: ['nouveau', 'populaire', 'promo']
        },
        isAvailable: { type: Boolean, default: true }
    }],

    // Horaires d'ouverture
    openingHours: {
        monday: { open: String, close: String, isClosed: Boolean },
        tuesday: { open: String, close: String, isClosed: Boolean },
        wednesday: { open: String, close: String, isClosed: Boolean },
        thursday: { open: String, close: String, isClosed: Boolean },
        friday: { open: String, close: String, isClosed: Boolean },
        saturday: { open: String, close: String, isClosed: Boolean },
        sunday: { open: String, close: String, isClosed: Boolean }
    },

    // Relation avec le propriétaire (utilisateur)
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Contact
    phone: {
        type: String,
        trim: true
    },

    email: {
        type: String,
        trim: true,
        lowercase: true
    },

    // Statistiques
    totalOrders: {
        type: Number,
        default: 0
    },

    totalRevenue: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index pour améliorer les performances de recherche
restaurantSchema.index({ name: 'text', cuisineType: 'text', description: 'text' });
restaurantSchema.index({ category: 1 });
restaurantSchema.index({ city: 1 });
restaurantSchema.index({ rating: -1 });
restaurantSchema.index({ isActive: 1 });

// Méthode pour calculer la note moyenne
restaurantSchema.methods.updateRating = function(newRating) {
    const totalRating = this.rating * this.reviewCount;
    this.reviewCount += 1;
    this.rating = (totalRating + newRating) / this.reviewCount;
    return this.save();
};

// Méthode pour vérifier si le restaurant est ouvert
restaurantSchema.methods.isOpenNow = function() {
    const now = new Date();
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const todayHours = this.openingHours[dayName];

    if (!todayHours || todayHours.isClosed) {
        return false;
    }

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHour, openMin] = todayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;

    return currentTime >= openTime && currentTime <= closeTime;
};

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;
