const router = require('express').Router();
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/roles');
const ctrl = require('../controllers/users.controller');

// Update own profile and optionally password
router.patch('/me', auth, ctrl.updateMe);

// Delete own account
router.delete('/me', auth, ctrl.deleteMe);

// Broker adds driver
router.post('/drivers', auth, requireRole('trucker'), ctrl.addDriver);

// Broker lists drivers
router.get('/drivers', auth, requireRole('trucker'), ctrl.listDrivers);

module.exports = router;
