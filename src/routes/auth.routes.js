const router = require('express').Router();
const { signup, login, me, refresh, verifyEmail, resendVerification, forgotPassword, resetPassword, getDeletionLink, validateDeletion, confirmDeletion, phoneCheck, phoneSignup, verifyOtp, setPin, phoneLogin, resendOtp } = require('../controllers/auth.controller');
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
// Phone-based OTP/PIN flow
router.post('/phone/check', phoneCheck);
router.post('/phone/signup', phoneSignup);
router.post('/phone/verify-otp', verifyOtp);
router.post('/phone/set-pin', setPin);
router.post('/phone/login', phoneLogin);
router.post('/phone/resend-otp', resendOtp);

module.exports = router;
