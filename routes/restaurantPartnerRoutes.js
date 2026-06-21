const express = require('express');
const router = express.Router();
const restaurantPartnerController = require('../controllers/restaurantPartnerController');
const authMiddleware = require('../middleware/authMiddleware');

// Route pour soumettre une candidature restaurant (client uniquement)
router.post('/apply', authMiddleware, restaurantPartnerController.submitRestaurantApplication);

// Routes admin pour gérer les candidatures
router.get('/requests', authMiddleware, restaurantPartnerController.getAllRestaurantRequests);
router.put('/accept/:userId', authMiddleware, restaurantPartnerController.acceptRestaurantRequest);
router.put('/reject/:userId', authMiddleware, restaurantPartnerController.rejectRestaurantRequest);

module.exports = router;
