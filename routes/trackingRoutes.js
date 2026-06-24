const express = require('express');
const auth = require('../middleware/authMiddleware');
const trackingController = require('../controllers/trackingController');

const router = express.Router();

router.get('/order/:orderId', auth, trackingController.getOrderTracking);
router.put('/order/:orderId/location', auth, trackingController.updateLocation);
router.put('/order/:orderId/status', auth, trackingController.updateStatus);

module.exports = router;
