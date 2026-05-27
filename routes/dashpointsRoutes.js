/**
 * ====================================
 * ROUTES DASHPOINTS
 * Programme de fidélité DashFood
 * ====================================
 */

const express = require('express');
const router = express.Router();

// Middleware d'authentification
const authMiddleware = require('../middleware/authMiddleware');

// Controller
const dashpointsController = require('../controllers/dashpointsController');

/**
 * @route   GET /api/dashpoints/user
 * @desc    Récupère les données DashPoints de l'utilisateur connecté
 * @access  Private (Client uniquement)
 */
router.get('/user', authMiddleware, dashpointsController.getUserDashPoints);

/**
 * @route   POST /api/dashpoints/redeem
 * @desc    Échange des DashPoints contre une récompense
 * @access  Private (Client uniquement)
 */
router.post('/redeem', authMiddleware, dashpointsController.redeemDashPoints);

module.exports = router;
