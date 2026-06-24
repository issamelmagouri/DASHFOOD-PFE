const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');

// Toutes les routes nécessitent une authentification

// Créer une nouvelle commande
router.post('/', authMiddleware, orderController.createOrder);
router.post('/create', authMiddleware, orderController.createOrderFromCart);

// Récupérer les commandes de l'utilisateur connecté
router.get('/my-orders', authMiddleware, orderController.getMyOrders);

// Récupérer les détails d'une commande spécifique
router.get('/:orderId', authMiddleware, orderController.getOrderById);

// Mettre à jour le statut d'une commande (Admin/Restaurant)
router.put('/:orderId/status', authMiddleware, orderController.updateOrderStatus);

// Annuler une commande
router.put('/:orderId/cancel', authMiddleware, orderController.cancelOrder);

// Recommander une commande
router.post('/:orderId/reorder', authMiddleware, orderController.reorderOrder);

module.exports = router;
