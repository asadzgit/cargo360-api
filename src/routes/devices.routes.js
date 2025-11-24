const router = require('express').Router();
const { register } = require('../controllers/devices.controller');
const auth = require('../middlewares/auth');

router.post('/register', auth, register);

module.exports = router;

