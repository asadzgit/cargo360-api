const router = require('express').Router();
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/roles');
const ctrl = require('../controllers/admin.controller');

router.use(auth, requireRole('admin'));
router.get('/users', ctrl.listUsers);
router.patch('/users/:id/approve', ctrl.approveTrucker);
router.get('/shipments', ctrl.listShipments);

module.exports = router;
