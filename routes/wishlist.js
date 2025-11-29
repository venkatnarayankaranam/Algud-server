const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { authMiddleware } = require('../middleware/auth');

// Add to wishlist
router.post('/add', authMiddleware, wishlistController.addToWishlist);
// Remove from wishlist
router.post('/remove', authMiddleware, wishlistController.removeFromWishlist);
// Get wishlist
router.get('/', authMiddleware, wishlistController.getWishlist);

module.exports = router;
