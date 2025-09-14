const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/location.controller');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/roles');

// Driver location tracking routes
router.post('/shipments/:id/track', auth, requireRole('driver'), ctrl.trackLocation);

// Location history and current location (accessible by customer, trucker, driver, admin)
router.get('/shipments/:id/history', auth, ctrl.getLocationHistory);
router.get('/shipments/:id/current', auth, ctrl.getCurrentLocation);

module.exports = router;
