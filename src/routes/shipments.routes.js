const router = require('express').Router();
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/roles');
const adminOnly = require('../middlewares/adminOnly');
const ctrl = require('../controllers/shipments.controller');
const discountRequestsCtrl = require('../controllers/discountRequests.controller');

// Admin routes (moderator can view, only admin can delete)
router.get('/', auth, requireRole('admin'), ctrl.getAll);
router.delete('/:id', auth, adminOnly, ctrl.delete);

// Customer routes
router.post('/', auth, requireRole('customer'), ctrl.create);
router.get('/mine', auth, requireRole('customer'), ctrl.mineCustomer);
router.put('/:id', auth, requireRole('customer'), ctrl.update);
router.patch('/:id/cancel', auth, requireRole('customer'), ctrl.cancelByCustomer);
router.post('/:id/discount-request', auth, requireRole('customer'), discountRequestsCtrl.createForShipment);

// Trucker routes
router.get('/available', auth, requireRole('trucker'), ctrl.availableForTruckers);
router.post('/:id/accept', auth, requireRole('admin'), ctrl.accept);
router.patch('/:id/status', auth, requireRole('admin'), ctrl.updateStatus);
router.get('/mine-trucker', auth, requireRole('trucker'), ctrl.mineTrucker);

// Driver routes (same as trucker for now)
router.get('/available-driver', auth, requireRole('driver'), ctrl.availableForTruckers);
router.post('/:id/accept-driver', auth, requireRole('driver'), ctrl.accept);
router.patch('/:id/status-driver', auth, requireRole('driver'), ctrl.updateStatus);
router.get('/mine-driver', auth, requireRole('driver'), ctrl.mineTrucker);

// Shared routes (customer, trucker, driver, admin can view)
router.get('/:id', auth, ctrl.getById);

module.exports = router;
