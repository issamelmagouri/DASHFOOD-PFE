const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');

exports.getMenuItems = async (req, res) => {
  try {
    const { category, search, restaurant } = req.query;
    const query = { available: true };

    if (restaurant) {
      if (!mongoose.isValidObjectId(restaurant)) {
        return res.status(400).json({ success: false, message: 'Identifiant de restaurant invalide' });
      }
      query.restaurant = restaurant;
    }

    if (category) {
      if (category === 'promotions') {
        query.badge = 'promo';
      } else if (!MenuItem.MENU_CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, message: 'Catégorie invalide', categories: [...MenuItem.MENU_CATEGORIES, 'promotions'] });
      } else {
        query.category = category;
      }
    }
    if (search?.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.name = { $regex: escapedSearch, $options: 'i' };
    }

    const menuItems = await MenuItem.find(query)
      .populate('restaurant', 'name image isActive deliveryFee freeDelivery')
      .sort({ category: 1, name: 1 });
    const availableItems = menuItems.filter((item) => item.restaurant && item.restaurant.isActive !== false);

    return res.json({ success: true, count: availableItems.length, menuItems: availableItems });
  } catch (error) {
    console.error('Erreur récupération catalogue:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors du chargement du catalogue' });
  }
};

exports.getMenuItemById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Identifiant de plat invalide' });
    }
    const menuItem = await MenuItem.findOne({ _id: req.params.id, available: true })
      .populate('restaurant', 'name image isActive deliveryFee freeDelivery');
    if (!menuItem || menuItem.restaurant?.isActive === false) {
      return res.status(404).json({ success: false, message: 'Plat indisponible ou introuvable' });
    }
    return res.json({ success: true, menuItem });
  } catch (error) {
    console.error('Erreur récupération plat:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors du chargement du plat' });
  }
};
