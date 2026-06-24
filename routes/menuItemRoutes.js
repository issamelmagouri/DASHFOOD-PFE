const express = require('express');
const menuItemController = require('../controllers/menuItemController');

const router = express.Router();
router.get('/', menuItemController.getMenuItems);
router.get('/:id', menuItemController.getMenuItemById);

module.exports = router;
