const express = require('express');
const router = express.Router();

const purchaseController = require('../controllers/purchase.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/', authMiddleware, purchaseController.getPurchases);
router.get('/:id', authMiddleware, purchaseController.getPurchaseById);
router.post('/', authMiddleware, purchaseController.createPurchase);
router.put('/:id', authMiddleware, purchaseController.updatePurchase);
router.delete('/:id', authMiddleware, purchaseController.deletePurchase);

module.exports = router;