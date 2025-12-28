const router = require('express').Router();
const { checkAppVersion } = require('../controllers/mobile.controller');

// Version check endpoint (no auth required - must work before login)
router.get('/app-version', checkAppVersion);

module.exports = router;


