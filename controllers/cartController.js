const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');

async function findMenuItem(menuItemId) {
  const collectionItem = await MenuItem.findOne({ _id: menuItemId, available: true });
  if (collectionItem) {
    const restaurant = await Restaurant.findOne({ _id: collectionItem.restaurant, isActive: true });
    if (!restaurant) return null;
    return {
      menuItem: collectionItem._id,
      restaurant,
      name: collectionItem.name,
      image: collectionItem.image,
      price: collectionItem.price
    };
  }

  const restaurant = await Restaurant.findOne({ 'menuItems._id': menuItemId, isActive: true });
  const embeddedItem = restaurant?.menuItems.id(menuItemId);
  if (!restaurant || !embeddedItem || embeddedItem.isAvailable === false) return null;
  return {
    menuItem: embeddedItem._id,
    restaurant,
    name: embeddedItem.name,
    image: embeddedItem.image,
    price: embeddedItem.price
  };
}

function emptyCart(userId) {
  return { user: userId, items: [], subtotal: 0, deliveryFee: 0, total: 0 };
}

exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    return res.json({ success: true, cart: cart || emptyCart(req.user.id) });
  } catch (error) {
    console.error('Erreur récupération panier:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors du chargement du panier' });
  }
};

exports.addItem = async (req, res) => {
  try {
    const { menuItemId } = req.body;
    const quantity = Number(req.body.quantity || 1);
    if (!mongoose.isValidObjectId(menuItemId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ success: false, message: 'Plat ou quantité invalide' });
    }

    const resolvedItem = await findMenuItem(menuItemId);
    if (!resolvedItem) return res.status(404).json({ success: false, message: 'Plat indisponible ou introuvable' });

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) cart = new Cart({ user: req.user.id, items: [] });
    const cartRestaurant = cart.items[0]?.restaurant;
    if (cartRestaurant && String(cartRestaurant) !== String(resolvedItem.restaurant._id)) {
      return res.status(409).json({
        success: false,
        code: 'DIFFERENT_RESTAURANT',
        message: 'Votre panier contient déjà des plats d’un autre restaurant. Videz-le avant de changer de restaurant.'
      });
    }

    const existing = cart.items.find((item) => String(item.menuItem) === String(resolvedItem.menuItem));
    if (existing) {
      if (existing.quantity + quantity > 99) {
        return res.status(400).json({ success: false, message: 'La quantité maximale par plat est 99' });
      }
      existing.quantity += quantity;
    } else {
      cart.items.push({
        menuItem: resolvedItem.menuItem,
        restaurant: resolvedItem.restaurant._id,
        restaurantName: resolvedItem.restaurant.name,
        name: resolvedItem.name,
        image: resolvedItem.image,
        price: resolvedItem.price,
        quantity
      });
    }
    cart.deliveryFee = resolvedItem.restaurant.freeDelivery ? 0 : Number(resolvedItem.restaurant.deliveryFee || 0);
    await cart.save();
    return res.status(201).json({ success: true, message: 'Plat ajouté au panier', cart });
  } catch (error) {
    return handleCartError(res, error, 'Erreur lors de l’ajout au panier');
  }
};

exports.updateItem = async (req, res) => {
  try {
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ success: false, message: 'La quantité doit être comprise entre 1 et 99' });
    }
    const cart = await Cart.findOne({ user: req.user.id });
    const item = cart?.items.id(req.params.itemId);
    if (!cart || !item) return res.status(404).json({ success: false, message: 'Article introuvable dans le panier' });
    item.quantity = quantity;
    await cart.save();
    return res.json({ success: true, message: 'Quantité mise à jour', cart });
  } catch (error) {
    return handleCartError(res, error, 'Erreur lors de la modification du panier');
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    const item = cart?.items.id(req.params.itemId);
    if (!cart || !item) return res.status(404).json({ success: false, message: 'Article introuvable dans le panier' });
    item.deleteOne();
    await cart.save();
    return res.json({ success: true, message: 'Article supprimé', cart });
  } catch (error) {
    return handleCartError(res, error, 'Erreur lors de la suppression de l’article');
  }
};

exports.clearCart = async (req, res) => {
  try {
    await Cart.deleteOne({ user: req.user.id });
    return res.json({ success: true, message: 'Panier vidé', cart: emptyCart(req.user.id) });
  } catch (error) {
    return handleCartError(res, error, 'Erreur lors du vidage du panier');
  }
};

function handleCartError(res, error, message) {
  console.error(message, error);
  if (error instanceof mongoose.Error.VersionError) {
    return res.status(409).json({ success: false, message: 'Le panier vient d’être modifié. Réessayez.' });
  }
  return res.status(500).json({ success: false, message });
}
