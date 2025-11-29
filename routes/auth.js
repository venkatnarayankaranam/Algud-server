// const express = require('express');
// const { body } = require('express-validator');
// const { register, login, getMe } = require('../controllers/authController');
// const { authMiddleware } = require('../middleware/auth');

// const router = express.Router();

// // Validation rules
// const registerValidation = [
//   body('name')
//     .trim()
//     .notEmpty()
//     .withMessage('Name is required')
//     .isLength({ min: 2, max: 50 })
//     .withMessage('Name must be between 2 and 50 characters'),
//   body('email')
//     .isEmail()
//     .withMessage('Please enter a valid email')
//     .normalizeEmail(),
//   body('password')
//     .isLength({ min: 6 })
//     .withMessage('Password must be at least 6 characters long')
// ];

// const loginValidation = [
//   body('email')
//     .isEmail()
//     .withMessage('Please enter a valid email')
//     .normalizeEmail(),
//   body('password')
//     .notEmpty()
//     .withMessage('Password is required')
// ];

// // @route   POST /api/auth/register
// // @desc    Register user
// // @access  Public
// router.post('/register', registerValidation, register);

// // @route   POST /api/auth/login
// // @desc    Login user
// // @access  Public
// router.post('/login', loginValidation, login);

// // Google OAuth endpoint
// const passport = require('passport')

// // Start Google OAuth flow
// router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

// // OAuth callback - passport will attach { user, token } as the user object
// router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), (req, res) => {
//   // On success, redirect back to client with the token as a query param
//   const clientUrl = process.env.CLIENT_URL || 'http://https://algud-iota.vercel.app'
//   const token = req.user && req.user.token
//   if (!token) return res.redirect(`${clientUrl}/login`)
//   // set httpOnly cookie and redirect to client root
//   res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' })
//   return res.redirect(clientUrl)
// })

// // Clear auth cookie
// router.post('/logout', (req, res) => {
//   res.clearCookie('token')
//   return res.json({ success: true })
// })

// // @route   GET /api/auth/me
// // @desc    Get current user
// // @access  Private
// router.get('/me', authMiddleware, getMe);

// module.exports = router;


const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.algud.in';
const JWT_SECRET = process.env.JWT_SECRET || 'algud_super_secret_jwt_key_2024';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 50 }),
  body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

// Auth routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Google Login Start
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// ✅ Google Login Callback (FINAL FIX)
router.get('/google/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.redirect(`${FRONTEND_URL}/login?error=missing_code`);

    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );

    // Exchange code for tokens
    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;
    if (!idToken) throw new Error('No id_token returned from Google');

    // Verify ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name || payload.given_name || 'Google User';
    if (!email) throw new Error('Google account has no email');

    // Find or create user
    const User = require('../models/User');
  const generateToken = require('../utils/generateToken');
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name, email, password: Math.random().toString(36).slice(-12) });
    }
  const token = generateToken(user._id);
    user.lastToken = token;
    await user.save();

    // Redirect to /google/final with token
    const redirectUrl = new URL('/api/auth/google/final', FRONTEND_URL);
    redirectUrl.searchParams.set('token', token);
    if (req.query.state) redirectUrl.searchParams.set('state', req.query.state);
    return res.redirect(redirectUrl.toString());
  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.redirect(`${FRONTEND_URL}/login?error=google_callback_failed`);
  }
});

router.get('/google/final', (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect(`${FRONTEND_URL}/login?error=missing_token`);

  try {
    // Ensure token is issued by this server
    jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Google final token verify failed:', error);
    return res.redirect(`${FRONTEND_URL}/login?error=invalid_token`);
  }

  const forwardedHost = (req.headers['x-forwarded-host'] || '').toString().toLowerCase();
  const hostname = (forwardedHost || req.hostname || '').toLowerCase();
  const isProd = process.env.NODE_ENV === 'production';
  const secure = Boolean(isProd || req.secure || req.headers['x-forwarded-proto'] === 'https');

  let cookieDomain;
  if (isProd) {
    if (hostname.endsWith('algud.in')) {
      cookieDomain = '.algud.in';
    } else if (hostname) {
      cookieDomain = hostname;
    }
  }

  res.cookie('token', token, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    domain: cookieDomain,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });

  // Also include token in URL for cross-domain support (frontend can store in localStorage)
  const redirectTarget = req.query.state ? `${FRONTEND_URL}${decodeURIComponent(req.query.state)}` : `${FRONTEND_URL}/`;
  const redirectUrl = new URL(redirectTarget);
  redirectUrl.searchParams.set('auth_token', token);
  return res.redirect(redirectUrl.toString());
});

// Temporary cookie test endpoint (safe to keep but can be removed later)
router.get('/cookie-test', (req, res) => {
  res.cookie('token-test', 'ok', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: '.algud.in',
    path: '/',
    maxAge: 10 * 60 * 1000
  });
  return res.json({ success: true, message: 'Test cookie set' });
});

// Logout
router.post('/logout', (req, res) => {
  // Determine domain for cookie clearing
  const hostname = (req.headers['x-forwarded-host'] || req.hostname || '').toLowerCase();
  const isProd = process.env.NODE_ENV === 'production';
  let cookieDomain;
  if (isProd && hostname.endsWith('algud.in')) {
    cookieDomain = '.algud.in';
  }
  // Always clear for both prod and localhost
  res.clearCookie('token', {
    domain: cookieDomain, // undefined for localhost, .algud.in for prod
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax'
  });
  return res.json({ success: true });
});

// Get current user
router.get('/me', authMiddleware, getMe);

module.exports = router;
