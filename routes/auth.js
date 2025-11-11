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
const passport = require('passport');

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

// Google OAuth Start
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth Callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const ENV = process.env.NODE_ENV;
    const clientUrl = process.env.CLIENT_URL
      || (ENV === 'production' ? 'https://algud.in' : 'http://localhost:5173');

    const token = req.user?.token;
    if (!token) return res.redirect(`${clientUrl}/login`);

    const isProd = ENV === 'production';

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "none",
      domain: isProd ? ".algud.in" : undefined, // <--- Critical Fix
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.redirect(clientUrl);
  }
);

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    domain: process.env.NODE_ENV === 'production' ? '.algud.in' : undefined,
    path: "/"
  });
  return res.json({ success: true });
});

// Get current user
router.get('/me', authMiddleware, getMe);

module.exports = router;