const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const cartController = require('../controllers/cartController');

const router = express.Router();
router.use(authMiddleware);
router.get('/', cartController.getCart);
router.post('/add', cartController.addItem);
router.put('/item/:itemId', cartController.updateItem);
router.delete('/item/:itemId', cartController.deleteItem);
router.delete('/clear', cartController.clearCart);

module.exports = router;
