const mongoose = require('mongoose');

const MENU_CATEGORIES = ['entrees', 'plats-principaux', 'burgers', 'pizzas', 'desserts', 'boissons'];

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, default: '/assets/images/restaurant-kitchen.png' },
  category: { type: String, enum: MENU_CATEGORIES, required: true, index: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  available: { type: Boolean, default: true, index: true },
  badge: {
    type: String,
    enum: ['nouveau', 'populaire', 'promo'],
    default: undefined
  }
}, { timestamps: true });

menuItemSchema.index({ name: 'text', description: 'text' });

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
MenuItem.MENU_CATEGORIES = MENU_CATEGORIES;

module.exports = MenuItem;
