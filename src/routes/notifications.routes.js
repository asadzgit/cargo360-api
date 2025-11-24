const router = require('express').Router();
const { list, markAsRead } = require('../controllers/notifications.controller');
const auth = require('../middlewares/auth');

router.get('/', auth, list);
router.put('/:id/read', auth, markAsRead);

module.exports = router;

