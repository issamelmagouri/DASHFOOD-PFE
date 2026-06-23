/**
 * Admin Routes - DashFood
 * Routes complètes pour l'espace administrateur
 */

const express = require('express');
const router = express.Router();
const adminDashboardController = require('../controllers/adminDashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkAdmin } = require('../middleware/adminMiddleware');

// ==================== DASHBOARD ====================
router.get('/dashboard/stats', authMiddleware, checkAdmin, adminDashboardController.getDashboardStats);

// ==================== UTILISATEURS ====================
router.get('/users', authMiddleware, checkAdmin, adminDashboardController.getAllUsers);
router.get('/users/:id', authMiddleware, checkAdmin, adminDashboardController.getUserById);
router.put('/users/:id/block', authMiddleware, checkAdmin, adminDashboardController.blockUser);
router.put('/users/:id/unblock', authMiddleware, checkAdmin, adminDashboardController.unblockUser);
router.delete('/users/:id', authMiddleware, checkAdmin, adminDashboardController.deleteUser);

// ==================== RESTAURANTS ====================
router.get('/restaurants', authMiddleware, checkAdmin, adminDashboardController.getAllRestaurants);
router.get('/restaurants/requests', authMiddleware, checkAdmin, adminDashboardController.getRestaurantRequests);
router.put('/restaurants/requests/:userId/accept', authMiddleware, checkAdmin, adminDashboardController.acceptRestaurantRequest);
router.put('/restaurants/requests/:userId/reject', authMiddleware, checkAdmin, adminDashboardController.rejectRestaurantRequest);

// ==================== LIVREURS ====================
router.get('/livreurs', authMiddleware, checkAdmin, adminDashboardController.getAllLivreurs);
router.get('/livreurs/requests', authMiddleware, checkAdmin, adminDashboardController.getDeliveryRequests);
router.put('/livreurs/requests/:userId/accept', authMiddleware, checkAdmin, adminDashboardController.acceptDeliveryRequest);
router.put('/livreurs/requests/:userId/reject', authMiddleware, checkAdmin, adminDashboardController.rejectDeliveryRequest);

// ==================== COMMANDES ====================
router.get('/orders', authMiddleware, checkAdmin, adminDashboardController.getAllOrders);
router.get('/orders/:id', authMiddleware, checkAdmin, adminDashboardController.getOrderById);

// ==================== STATISTIQUES ====================
router.get('/statistics', authMiddleware, checkAdmin, adminDashboardController.getStatistics);

module.exports = router;
