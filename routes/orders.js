const express = require('express');
const { body } = require('express-validator');
const {
  createOrder,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  getOrder
} = require('../controllers/orderController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Validation rules for order creation
const orderValidation = [
  body('products')
    .isArray({ min: 1 })
    .withMessage('At least one product is required'),
  body('products.*.productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('products.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('shippingAddress.name')
    .trim()
    .notEmpty()
    .withMessage('Shipping name is required'),
  body('shippingAddress.address')
    .trim()
    .notEmpty()
    .withMessage('Shipping address is required'),
  body('shippingAddress.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('shippingAddress.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('shippingAddress.pincode')
    .trim()
    .notEmpty()
    .withMessage('Pincode is required'),
  body('shippingAddress.phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
];

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', authMiddleware, orderValidation, createOrder);

// @route   GET /api/orders/user
// @desc    Get user orders
// @access  Private
router.get('/user', authMiddleware, getUserOrders);

// @route   GET /api/orders/admin
// @desc    Get all orders (admin)
// @access  Private/Admin
router.get('/admin', authMiddleware, adminMiddleware, getAllOrders);

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', authMiddleware, getOrder);

// @route   PUT /api/orders/admin/:id
// @desc    Update order status (admin)
// @access  Private/Admin
router.put('/admin/:id', authMiddleware, adminMiddleware, updateOrderStatus);

module.exports = router;
