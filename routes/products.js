const express = require('express');
const { body } = require('express-validator');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories
} = require('../controllers/productController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Validation rules for product creation/update
const productValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Product description is required')
    .isLength({ max: 1000 })
    .withMessage('Description cannot be more than 1000 characters'),
  body('price')
    .isNumeric()
    .withMessage('Price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category')
    .isIn(['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Accessories', 'Shoes'])
    .withMessage('Invalid category'),
  body('sizes')
    .isArray({ min: 1 })
    .withMessage('At least one size must be selected'),
  body('imageURL')
    .isURL()
    .withMessage('Image URL must be a valid URL')
    .custom((value) => {
      if (!value) return false
      const cloudinaryPattern = /^https?:\/\/(res|api)\.cloudinary\.com\//i
      const drivePattern = /^https:\/\/drive\.google\.com\/uc\?export=view&id=/i
      const genericHttp = /^https?:\/\/.+/i
      return cloudinaryPattern.test(value) || drivePattern.test(value) || genericHttp.test(value)
    })
    .withMessage('Please provide a valid image URL (Cloudinary, Google Drive, or https URL)'),
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer')
];

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get('/', getProducts);

// @route   GET /api/products/categories
// @desc    Get product categories
// @access  Public
router.get('/categories', getCategories);

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', getProduct);

// @route   POST /api/products
// @desc    Create new product
// @access  Private/Admin
router.post('/', authMiddleware, adminMiddleware, productValidation, createProduct);

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private/Admin
router.put('/:id', authMiddleware, adminMiddleware, productValidation, updateProduct);

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private/Admin
router.delete('/:id', authMiddleware, adminMiddleware, deleteProduct);

module.exports = router;
