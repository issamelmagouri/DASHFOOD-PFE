const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const foodPartyController = require('../controllers/foodPartyController');

const router = express.Router();

router.use(authMiddleware);
router.use((req, res, next) => {
  if (req.user.role !== 'client') {
    return res.status(403).json({ success: false, message: 'La Food Party est réservée aux comptes clients' });
  }
  return next();
});

router.post('/create', foodPartyController.createFoodParty);
router.get('/my', foodPartyController.getMyFoodParty);
router.get('/:inviteCode', foodPartyController.getFoodPartyByCode);
router.post('/:inviteCode/join', foodPartyController.joinFoodParty);
router.put('/:inviteCode/address', foodPartyController.confirmDeliveryAddress);
router.post('/:inviteCode/items', foodPartyController.addItem);
router.put('/:inviteCode/items/:itemId', foodPartyController.updateItem);
router.delete('/:inviteCode/items/:itemId', foodPartyController.deleteItem);
router.post('/:inviteCode/checkout', foodPartyController.checkout);
router.post('/:inviteCode/cancel', foodPartyController.cancelFoodParty);

module.exports = router;
