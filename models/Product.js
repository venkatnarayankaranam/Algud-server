const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Accessories', 'Shoes']
  },
  sizes: [{
    type: String,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40', '42']
  }],
  imageURL: {
    type: String,
    required: [true, 'Image URL is required'],
    validate: {
      // Accept Cloudinary URLs, Google Drive direct-view URLs, or any http/https URL.
      validator: function(v) {
        if (!v) return false
        // Cloudinary (res.cloudinary.com or api.cloudinary.com) or Google Drive direct view
        const cloudinaryPattern = /^https?:\/\/(res|api)\.cloudinary\.com\//i
        const drivePattern = /^https:\/\/drive\.google\.com\/uc\?export=view&id=/i
        const genericHttp = /^https?:\/\/.+/i
        return cloudinaryPattern.test(v) || drivePattern.test(v) || genericHttp.test(v)
      },
      message: 'Please provide a valid image URL (Cloudinary, Google Drive, or https URL)'
    }
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  status: {
    type: String,
    enum: ['Available', 'Out of Stock'],
    default: 'Available'
  }
}, {
  timestamps: true
});

// Update status based on stock
productSchema.pre('save', function(next) {
  if (this.stock === 0) {
    this.status = 'Out of Stock';
  } else {
    this.status = 'Available';
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
