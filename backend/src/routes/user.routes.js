const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/', authMiddleware, userController.getUsers);
router.get('/roles', authMiddleware, userController.getRoles);
router.post('/', authMiddleware, userController.createUser);
router.put('/:id', authMiddleware, userController.updateUser);
router.patch('/:id/reset-password', authMiddleware, userController.resetUserPassword);
router.patch('/:id/toggle-status', authMiddleware, userController.toggleUserStatus);

module.exports = router;