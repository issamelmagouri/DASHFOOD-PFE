/*

  ROUTES DASHPOINTS
  Programme de fidélité DashFood
 
 */

const express = require('express');
const router = express.Router();

// Middleware d'authentification
const authMiddleware = require('../middleware/authMiddleware');

// Controller
const dashpointsController = require('../controllers/dashpointsController');

/**
    GET /api/dashpoints/user
    Récupère les données DashPoints de l'utilisateur connecté
   Private (Client uniquement)
 */
router.get('/user', authMiddleware, dashpointsController.getUserDashPoints);


router.post('/redeem', authMiddleware, dashpointsController.redeemDashPoints);

module.exports = router;
