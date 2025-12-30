const router = require('express').Router();
const { register, testNotification, listMyTokens } = require('../controllers/devices.controller');
const auth = require('../middlewares/auth');

router.post('/register', auth, register);
router.get('/test-notification', auth, testNotification);
router.get('/my-tokens', auth, listMyTokens);

module.exports = router;

