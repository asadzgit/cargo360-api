const router = require('express').Router();
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/roles');
const ctrl = require('../controllers/shipments.controller');

// Customer
router.post('/', auth, requireRole('customer'), ctrl.create);
router.get('/mine', auth, requireRole('customer'), ctrl.mineCustomer);
router.patch('/:id/cancel', auth, requireRole('customer'), ctrl.cancelByCustomer);

// Trucker
router.get('/available', auth, requireRole('trucker'), ctrl.availableForTruckers);
router.post('/:id/accept', auth, requireRole('trucker'), ctrl.accept);
router.post('/:id/status', auth, requireRole('trucker'), ctrl.updateStatus);

// Trucker personal shipments
router.get('/mine-trucker', auth, requireRole('trucker'), ctrl.mineTrucker);

module.exports = router;
