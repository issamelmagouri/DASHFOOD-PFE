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

module.exports = router;
