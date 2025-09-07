const router = require('express').Router();
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/roles');
const ctrl = require('../controllers/reviews.controller');

router.post('/:id', auth, requireRole('customer','trucker'), ctrl.create);

module.exports = router;
