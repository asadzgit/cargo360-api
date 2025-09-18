const router = require('express').Router();
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/roles');
const adminOnly = require('../middlewares/adminOnly');
const ctrl = require('../controllers/admin.controller');
const assignmentCtrl = require('../controllers/assignment.controller');

// Routes accessible by both admin and moderator
router.use(auth);
router.get('/users', requireRole('admin'), ctrl.listUsers);
router.get('/shipments', requireRole('admin'), ctrl.listShipments);

// Routes accessible only by admin (not moderator)
router.patch('/users/:id/approve', auth, adminOnly, ctrl.approveTrucker);
router.patch('/shipments/:id/assign', auth, adminOnly, assignmentCtrl.assign);
router.put('/shipments/:id', auth, adminOnly, ctrl.updateShipment);

module.exports = router;
