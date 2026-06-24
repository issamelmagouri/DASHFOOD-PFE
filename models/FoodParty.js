const mongoose = require('mongoose');

const foodPartyItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { _id: true });

const participantDeliverySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deliveryAddress: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  latitude: Number,
  longitude: Number,
  addressConfirmed: {
    type: Boolean,
    default: false
  },
  confirmedAt: Date
}, { _id: false });

const foodPartySchema = new mongoose.Schema({
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  participantDeliveries: [participantDeliverySchema],
  items: [foodPartyItemSchema],
  totalPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'ordered', 'cancelled'],
    default: 'active',
    index: true
  },
  finalOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  finalOrders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  dashPointsEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  dashPointsAwarded: {
    type: Boolean,
    default: false
  },
  dashPointsAwardedAt: Date
}, {
  timestamps: true,
  optimisticConcurrency: true
});

foodPartySchema.index(
  { host: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

foodPartySchema.methods.recalculateTotal = function recalculateTotal() {
  const total = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  this.totalPrice = Math.round((total + Number.EPSILON) * 100) / 100;
  return this.totalPrice;
};

foodPartySchema.pre('save', function updateTotal(next) {
  this.recalculateTotal();
  next();
});

module.exports = mongoose.model('FoodParty', foodPartySchema);
