// Routes pour les messages de contact
// Gere les endpoints API pour le formulaire contact

const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// POST /api/contact - Creer un nouveau message de contact
router.post('/', contactController.createContactMessage);

// GET /api/contact - Recuperer tous les messages (pour admin futur)
router.get('/', contactController.getAllContactMessages);

// GET /api/contact/:id - Recuperer un message specifique
router.get('/:id', contactController.getContactMessageById);

// PUT /api/contact/:id/status - Mettre a jour le statut d'un message
router.put('/:id/status', contactController.updateContactStatus);

module.exports = router;
