const express = require('express');
const { body } = require('express-validator');
const {
  createPayment,
  verifyPayment,
  paymentWebhook,
  payuResponse,
  diag
} = require('../controllers/paymentController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Validation rules for payment creation
const paymentValidation = [
  body('orderId')
    .isMongoId()
    .withMessage('Invalid order ID'),
  body('customerDetails.name')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required'),
  body('customerDetails.email')
    .isEmail()
    .withMessage('Valid email is required'),
  body('customerDetails.phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
];

// @route   POST /api/payment/create
// @desc    Create payment session
// @access  Private
router.post('/create', authMiddleware, paymentValidation, createPayment);

// Backwards-compatible: POST /api/payment/create-order
router.post('/create-order', authMiddleware, paymentValidation, createPayment);

// @route   POST /api/payment/verify
// @desc    Verify payment
// @access  Private
router.post('/verify', authMiddleware, verifyPayment);

// Backwards-compatible: POST /api/payment/verify-payment
router.post('/verify-payment', authMiddleware, verifyPayment);

// @route   POST /api/payment/webhook
// @desc    Payment webhook
// @access  Public
router.post('/webhook', paymentWebhook);

// PayU success/failure response endpoint (PayU will POST form data here)
// @route   POST /api/payment/payu-response
// @access  Public
// Accept both POST (real PayU) and GET (stub/test links) so local testing works
router.post('/payu-response', payuResponse);
router.get('/payu-response', payuResponse);

// Diagnostic route to check config presence (protected)
// Diagnostic route to check config presence (protected)
router.get('/diag', authMiddleware, diag);

// Public diagnostic route (safe - does not return secrets) useful for local debugging
// returns booleans indicating whether Razorpay env vars are set
router.get('/diag-public', diag);

module.exports = router;
