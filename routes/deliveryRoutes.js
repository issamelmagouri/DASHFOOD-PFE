const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

/**
 * Routes pour la gestion des demandes de livreur
 */

// POST /api/delivery/apply - Soumettre une candidature (Client uniquement)
router.post('/apply', 
  authMiddleware, 
  deliveryController.submitDeliveryApplication
);

// GET /api/delivery/requests - Récupérer toutes les demandes (Admin uniquement)
router.get('/requests', 
  checkRole(['admin']), 
  deliveryController.getAllDeliveryRequests
);

// PUT /api/delivery/accept/:userId - Accepter une demande (Admin uniquement)
router.put('/accept/:userId', 
  checkRole(['admin']), 
  deliveryController.acceptDeliveryRequest
);

// PUT /api/delivery/reject/:userId - Refuser une demande (Admin uniquement)
router.put('/reject/:userId',
  checkRole(['admin']),
  deliveryController.rejectDeliveryRequest
);

/**
 * Routes pour la gestion des livraisons (Livreur uniquement)
 */

// GET /api/delivery/available - Récupérer les livraisons disponibles
router.get('/available',
  authMiddleware,
  checkRole(['livreur']),
  deliveryController.getAvailableDeliveries
);

// GET /api/delivery/my-current - Récupérer la livraison en cours du livreur
router.get('/my-current',
  authMiddleware,
  checkRole(['livreur']),
  deliveryController.getMyCurrentDelivery
);

// POST /api/delivery/accept/:deliveryId - Accepter une livraison
router.post('/accept/:deliveryId',
  authMiddleware,
  checkRole(['livreur']),
  deliveryController.acceptDelivery
);

// PUT /api/delivery/status/:deliveryId - Mettre à jour le statut d'une livraison
router.put('/status/:deliveryId',
  authMiddleware,
  checkRole(['livreur']),
  deliveryController.updateDeliveryStatus
);

// GET /api/delivery/my-stats - Récupérer les statistiques du livreur
router.get('/my-stats',
  authMiddleware,
  checkRole(['livreur']),
  deliveryController.getMyStats
);

// GET /api/delivery/my-history - Récupérer l'historique des livraisons
router.get('/my-history',
  authMiddleware,
  checkRole(['livreur']),
  deliveryController.getMyHistory
);

module.exports = router;
