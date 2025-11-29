// const jwt = require('jsonwebtoken');
// const User = require('../models/User');
// const { validationResult } = require('express-validator');

// // Generate JWT token
// const generateToken = (id) => {
//   const secret = process.env.JWT_SECRET || 'algud_super_secret_jwt_key_2024';
//   return jwt.sign({ id }, secret, {
//     expiresIn: '30d',
//   });
// };

// // @desc    Register user
// // @route   POST /api/auth/register
// // @access  Public
// const register = async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation errors',
//         errors: errors.array()
//       });
//     }

//     const { name, email, password } = req.body;

//     // Check if user already exists
//     const userExists = await User.findOne({ email });
//     if (userExists) {
//       return res.status(400).json({
//         success: false,
//         message: 'User already exists with this email'
//       });
//     }

//     // Create user
//     const user = await User.create({
//       name,
//       email,
//       password
//     });

//     if (user) {
//       // generate and persist token on user record
//       const token = generateToken(user._id)
//       try { user.lastToken = token; await user.save(); } catch (e) { console.warn('Failed to save lastToken:', e) }

//       const isProd = process.env.NODE_ENV === 'production'
//       res.cookie('token', token, {
//         httpOnly: true,
//         secure: isProd,
//         sameSite: isProd ? 'none' : 'lax',
//         maxAge: 30 * 24 * 60 * 60 * 1000,
//       })

//       res.status(201).json({
//         success: true,
//         message: 'User registered successfully',
//         data: {
//           _id: user._id,
//           name: user.name,
//           email: user.email,
//           role: user.role,
//           token
//         }
//       });
//     } else {
//       res.status(400).json({
//         success: false,
//         message: 'Invalid user data'
//       });
//     }
//   } catch (error) {
//     console.error('Register error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error during registration'
//     });
//   }
// };

// // @desc    Login user
// // @route   POST /api/auth/login
// // @access  Public
// const login = async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation errors',
//         errors: errors.array()
//       });
//     }

//     const { email, password } = req.body;

//     // Check for user
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials'
//       });
//     }

//     // Check password
//     const isMatch = await user.matchPassword(password);
//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials'
//       });
//     }

//     const token = (function(){ const t = generateToken(user._id); try { user.lastToken = t; user.save().catch(()=>{}); } catch(e){} return t })()
//     const isProd = process.env.NODE_ENV === 'production'
//     res.cookie('token', token, {
//       httpOnly: true,
//       secure: isProd,
//       sameSite: isProd ? 'none' : 'lax',
//       maxAge: 30 * 24 * 60 * 60 * 1000,
//     })

//     res.json({
//       success: true,
//       message: 'Login successful',
//       data: {
//         _id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         token
//       }
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error during login'
//     });
//   }
// };

// // @desc    Get current user
// // @route   GET /api/auth/me
// // @access  Private
// const getMe = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).select('-password');
//     res.json({
//       success: true,
//       data: user
//     });
//   } catch (error) {
//     console.error('Get me error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// };

// // @desc    Google token verify (client-side ID token -> server-issued JWT)
// // @route   POST /api/auth/google
// // @access  Public
// const googleAuth = async (req, res) => {
//   try {
//     const { idToken } = req.body;
//     if (!idToken) return res.status(400).json({ success: false, message: 'Missing idToken' });

//     // Verify token using google-auth-library
//     const { OAuth2Client } = require('google-auth-library');
//     const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
//     const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
//     const payload = ticket.getPayload();
//     const { email, name } = payload;

//     if (!email) return res.status(400).json({ success: false, message: 'Google account has no email' });

//     // Find or create user
//     let user = await User.findOne({ email });
//     if (!user) {
//       const randomPass = Math.random().toString(36).slice(-12) + Date.now();
//       user = await User.create({ name: name || 'Google User', email, password: randomPass });
//     }

//     // Issue server-signed JWT and set it in an httpOnly cookie
//     const token = generateToken(user._id);
//     try { user.lastToken = token; await user.save(); } catch (e) { console.warn('Failed to save lastToken (googleAuth):', e) }

//     const isProd = process.env.NODE_ENV === 'production'
//     res.cookie('token', token, {
//       httpOnly: true,
//       secure: isProd,
//       sameSite: isProd ? 'none' : 'lax',
//       maxAge: 30 * 24 * 60 * 60 * 1000,
//     });

//     return res.json({ success: true, data: { _id: user._id, name: user.name, email: user.email, role: user.role } });
//   } catch (error) {
//     console.error('Google auth error:', error);
//     res.status(500).json({ success: false, message: 'Google authentication failed' });
//   }
// }

// module.exports = {
//   register,
//   login,
//   getMe
//   , googleAuth,
//   generateToken
// };



const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { validationResult } = require("express-validator");

// Generate JWT
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || "algud_super_secret_jwt_key_2024";
  return jwt.sign({ id }, secret, { expiresIn: "30d" });
};

// Helper to send token in cookie
const sendTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,          // REQUIRED on HTTPS (Vercel/Render)
    sameSite: "none",      // REQUIRED because frontend & backend are different domains
    path: "/",             
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
};

// REGISTER
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ success: false, message: "User already exists" });

    const user = await User.create({ name, email, password });

    const token = generateToken(user._id);
    sendTokenCookie(res, token);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { _id: user._id, name: user.name, email: user.email, role: user.role, token }
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = generateToken(user._id);
    sendTokenCookie(res, token);

    return res.json({
      success: true,
      message: "Login successful",
      data: { _id: user._id, name: user.name, email: user.email, role: user.role, token }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET ME
const getMe = async (req, res) => {
  try {
    // req.user is already set by authMiddleware and has password excluded
    res.json({ success: true, data: req.user });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { register, login, getMe };
