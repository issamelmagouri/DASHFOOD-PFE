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
router.get('/restaurants/requests', authMiddleware, checkAdmin, adminDashboardController.getRestaurantRequests);
router.put('/restaurants/requests/:userId/accept', authMiddleware, checkAdmin, adminDashboardController.acceptRestaurantRequest);
router.put('/restaurants/requests/:userId/reject', authMiddleware, checkAdmin, adminDashboardController.rejectRestaurantRequest);
router.get('/restaurants', authMiddleware, checkAdmin, adminDashboardController.getAllRestaurants);
router.get('/restaurants/:id', authMiddleware, checkAdmin, adminDashboardController.getRestaurantById);
router.put('/restaurants/:id/suspend', authMiddleware, checkAdmin, adminDashboardController.suspendRestaurant);
router.put('/restaurants/:id/activate', authMiddleware, checkAdmin, adminDashboardController.activateRestaurant);
router.delete('/restaurants/:id', authMiddleware, checkAdmin, adminDashboardController.deleteRestaurant);

// ==================== LIVREURS ====================
router.get('/livreurs/requests', authMiddleware, checkAdmin, adminDashboardController.getDeliveryRequests);
router.put('/livreurs/requests/:userId/accept', authMiddleware, checkAdmin, adminDashboardController.acceptDeliveryRequest);
router.put('/livreurs/requests/:userId/reject', authMiddleware, checkAdmin, adminDashboardController.rejectDeliveryRequest);
router.get('/livreurs', authMiddleware, checkAdmin, adminDashboardController.getAllLivreurs);
router.get('/livreurs/:id', authMiddleware, checkAdmin, adminDashboardController.getLivreurById);
router.put('/livreurs/:id/suspend', authMiddleware, checkAdmin, adminDashboardController.suspendLivreur);
router.put('/livreurs/:id/activate', authMiddleware, checkAdmin, adminDashboardController.activateLivreur);
router.delete('/livreurs/:id', authMiddleware, checkAdmin, adminDashboardController.deleteLivreur);

// ==================== COMMANDES ====================
router.get('/orders', authMiddleware, checkAdmin, adminDashboardController.getAllOrders);
router.get('/orders/:id', authMiddleware, checkAdmin, adminDashboardController.getOrderById);

// ==================== STATISTIQUES ====================
router.get('/statistics', authMiddleware, checkAdmin, adminDashboardController.getStatistics);

module.exports = router;
