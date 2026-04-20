const express = require('express');
const router = express.Router();

const salesController = require('../controllers/sales.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/', authMiddleware, salesController.getSalesInvoices);
router.get('/:id', authMiddleware, salesController.getSalesInvoiceById);
router.post('/', authMiddleware, salesController.createSalesInvoice);
router.put('/:id', authMiddleware, salesController.updateSalesInvoice);
router.patch('/:id/confirm-payment', authMiddleware, salesController.confirmSalesInvoicePayment);

module.exports = router;