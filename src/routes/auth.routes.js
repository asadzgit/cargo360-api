const router = require('express').Router();
const { signup, login, me, refresh } = require('../controllers/auth.controller');
const auth = require('../middlewares/auth');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', auth, me);
router.post('/refresh', refresh);

module.exports = router;
