const router = require('express').Router();
const { signup, login, me, refresh, verifyEmail, resendVerification, forgotPassword, resetPassword, getDeletionLink, validateDeletion, confirmDeletion } = require('../controllers/auth.controller');
const auth = require('../middlewares/auth');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', auth, me);
router.post('/refresh', refresh);

// Email verification routes
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Account deletion link flow
router.post('/deletion-link', auth, getDeletionLink);      // authenticated
router.post('/deletion/validate', validateDeletion);       // no auth
router.post('/deletion/confirm', confirmDeletion);         // no auth

module.exports = router;
