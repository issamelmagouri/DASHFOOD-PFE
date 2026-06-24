const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, required: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  restaurantName: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  image: { type: String, default: '/assets/images/restaurant-kitchen.png' },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1, max: 99, default: 1 }
}, { _id: true });

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  items: [cartItemSchema],
  subtotal: { type: Number, default: 0, min: 0 },
  deliveryFee: { type: Number, default: 0, min: 0 },
  total: { type: Number, default: 0, min: 0 }
}, { timestamps: true, optimisticConcurrency: true });

cartSchema.methods.recalculateTotals = function recalculateTotals() {
  const subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  this.subtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;
  if (!this.items.length) this.deliveryFee = 0;
  this.total = Math.round((this.subtotal + this.deliveryFee + Number.EPSILON) * 100) / 100;
};

cartSchema.pre('save', function calculateCartTotals(next) {
  this.recalculateTotals();
  next();
});

module.exports = mongoose.model('Cart', cartSchema);
