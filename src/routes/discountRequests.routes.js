const router = require('express').Router();
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/roles');
const adminOnly = require('../middlewares/adminOnly');
const ctrl = require('../controllers/discountRequests.controller');

// Admin decision on a discount request
router.patch('/:id', auth, adminOnly, ctrl.decide);

module.exports = router;
