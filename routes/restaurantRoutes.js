const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');

/**
 * Routes publiques - Consultation des restaurants
 */

// GET /api/restaurants - Récupère tous les restaurants avec filtres optionnels
router.get('/', restaurantController.getAllRestaurants);

// GET /api/restaurants/featured - Récupère les restaurants vedettes
router.get('/featured', restaurantController.getFeaturedRestaurants);

// GET /api/restaurants/search - Recherche de restaurants
router.get('/search', restaurantController.searchRestaurants);

// GET /api/restaurants/cities - Récupère les villes disponibles
router.get('/cities', restaurantController.getAvailableCities);

// GET /api/restaurants/stats/categories - Statistiques par catégorie
router.get('/stats/categories', restaurantController.getCategoryStats);

// GET /api/restaurants/category/:category - Restaurants par catégorie
router.get('/category/:category', restaurantController.getRestaurantsByCategory);

// GET /api/restaurants/:id - Récupère un restaurant par ID
router.get('/:id', restaurantController.getRestaurantById);

// GET /api/restaurants/:id/menu - Récupère le menu d'un restaurant
router.get('/:id/menu', restaurantController.getRestaurantMenu);

module.exports = router;
