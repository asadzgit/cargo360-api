const router = require('express').Router();
const auth = require('../middlewares/auth');
const ctrl = require('../controllers/users.controller');

// Update own profile and optionally password
router.patch('/me', auth, ctrl.updateMe);

// Delete own account
router.delete('/me', auth, ctrl.deleteMe);

module.exports = router;
