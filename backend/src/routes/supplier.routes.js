const express = require('express');
const router = express.Router();

const supplierController = require('../controllers/supplier.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/', authMiddleware, supplierController.getSuppliers);
router.post('/', authMiddleware, supplierController.createSupplier);
router.put('/:id', authMiddleware, supplierController.updateSupplier);
router.delete('/:id', authMiddleware, supplierController.deleteSupplier);

module.exports = router;