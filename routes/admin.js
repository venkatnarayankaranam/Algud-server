const express = require('express');
const {
  getRevenueAnalytics,
  getDashboardStats,
  createAdminUser,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpdateInventory,
  getAllOrders,
  updateOrderStatus,
  getOrderDetails,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllUsers
} = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// @route   POST /api/admin/setup
// @desc    Create admin user (for initial setup)
// @access  Public
router.post('/setup', createAdminUser);

// @route   GET /api/admin/revenue
// @desc    Get revenue analytics
// @access  Private/Admin
router.get('/revenue', authMiddleware, adminMiddleware, getRevenueAnalytics);

// @route   GET /api/admin/dashboard
// @desc    Get dashboard statistics
// @access  Private/Admin
router.get('/dashboard', authMiddleware, adminMiddleware, getDashboardStats);

// @route   GET /api/admin/products
// @desc    Get all products with pagination and filtering
// @access  Private/Admin
router.get('/products', authMiddleware, adminMiddleware, getAllProducts);

// @route   POST /api/admin/products
// @desc    Create new product
// @access  Private/Admin
router.post('/products', authMiddleware, adminMiddleware, upload.single('image'), handleUploadError, createProduct);

// @route   PUT /api/admin/products/:id
// @desc    Update product
// @access  Private/Admin
router.put('/products/:id', authMiddleware, adminMiddleware, upload.single('image'), handleUploadError, updateProduct);

// @route   DELETE /api/admin/products/:id
// @desc    Delete product
// @access  Private/Admin
router.delete('/products/:id', authMiddleware, adminMiddleware, deleteProduct);

// @route   PUT /api/admin/products/inventory/bulk
// @desc    Bulk update inventory
// @access  Private/Admin
router.put('/products/inventory/bulk', authMiddleware, adminMiddleware, bulkUpdateInventory);

// @route   GET /api/admin/orders
// @desc    Get all orders with pagination and filtering
// @access  Private/Admin
router.get('/orders', authMiddleware, adminMiddleware, getAllOrders);

// @route   GET /api/admin/orders/:id
// @desc    Get order details
// @access  Private/Admin
router.get('/orders/:id', authMiddleware, adminMiddleware, getOrderDetails);

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status
// @access  Private/Admin
router.put('/orders/:id/status', authMiddleware, adminMiddleware, updateOrderStatus);

// @route   GET /api/admin/categories
// @desc    Get categories with stats
// @access  Private/Admin
router.get('/categories', authMiddleware, adminMiddleware, getCategories);

// Category CRUD
// POST /api/admin/categories
router.post('/categories', authMiddleware, adminMiddleware, createCategory);

// PUT /api/admin/categories/:id
router.put('/categories/:id', authMiddleware, adminMiddleware, updateCategory);

// DELETE /api/admin/categories/:id
router.delete('/categories/:id', authMiddleware, adminMiddleware, deleteCategory);

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filtering
// @access  Private/Admin
router.get('/users', authMiddleware, adminMiddleware, getAllUsers);

module.exports = router;
