const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Category = require('../models/Category');
const bcrypt = require('bcryptjs');

// @desc    Get revenue analytics
// @route   GET /api/admin/revenue
// @access  Private/Admin
const getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;

    let startDate, endDate, groupBy;

    // Set date range based on period
    const now = new Date();
    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        endDate = now;
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case 'weekly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
        endDate = now;
        groupBy = { $dateToString: { format: '%Y-W%U', date: '$createdAt' } };
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        endDate = now;
        groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      default:
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        endDate = now;
        groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    }

    // Get revenue data
    const revenueData = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'Paid',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: groupBy,
          totalRevenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get total statistics
    const totalStats = await Order.aggregate([
      {
        $match: { paymentStatus: 'Paid' }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Get recent orders
    const recentOrders = await Order.find({ paymentStatus: 'Paid' })
      .populate('userId', 'name email')
      .populate('products.productId', 'name imageURL')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get top selling products
    const topProducts = await Order.aggregate([
      {
        $match: { paymentStatus: 'Paid' }
      },
      {
        $unwind: '$products'
      },
      {
        $group: {
          _id: '$products.productId',
          totalSold: { $sum: '$products.quantity' },
          totalRevenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $project: {
          productName: '$product.name',
          productImage: '$product.imageURL',
          totalSold: 1,
          totalRevenue: 1
        }
      },
      {
        $sort: { totalSold: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Get dashboard stats
    const dashboardStats = {
      totalUsers: await User.countDocuments(),
      totalProducts: await Product.countDocuments(),
      totalOrders: await Order.countDocuments(),
      totalRevenue: totalStats[0]?.totalRevenue || 0,
      averageOrderValue: totalStats[0]?.averageOrderValue || 0,
      pendingOrders: await Order.countDocuments({ orderStatus: 'Pending' }),
      outOfStockProducts: await Product.countDocuments({ stock: 0 })
    };

    res.json({
      success: true,
      data: {
        revenueData,
        totalStats: totalStats[0] || {},
        recentOrders,
        topProducts,
        dashboardStats
      }
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching revenue analytics'
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const paidOrders = await Order.countDocuments({ paymentStatus: 'Paid' });
    const pendingOrders = await Order.countDocuments({ orderStatus: 'Pending' });
    const outOfStockProducts = await Product.countDocuments({ stock: 0 });

    // Calculate total revenue
    const revenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        totalOrders,
        paidOrders,
        pendingOrders,
        outOfStockProducts,
        totalRevenue
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics'
    });
  }
};

// @desc    Create admin user
// @route   POST /api/admin/setup
// @access  Public (for initial setup)
const createAdminUser = async (req, res) => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@algud.com' });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin user already exists'
      });
    }

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@algud.com',
      password: 'Algud@admin',
      role: 'admin'
    });

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        id: adminUser._id,
        email: adminUser.email,
        role: adminUser.role
      }
    });
  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating admin user'
    });
  }
};

// @desc    Get all products with pagination and filtering
// @route   GET /api/admin/products
// @access  Private/Admin
const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalProducts: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products'
    });
  }
};

// @desc    Create new product
// @route   POST /api/admin/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    // Debug: log incoming payload to help trace client-side Cloudinary uploads
    console.log('createProduct called. req.body keys:', Object.keys(req.body));
    console.log('createProduct req.body preview:', {
      name: req.body.name,
      category: req.body.category,
      price: req.body.price,
      stock: req.body.stock,
      imageURL: req.body.imageURL && String(req.body.imageURL).slice(0, 120)
    });
    if (req.file) console.log('createProduct received req.file (exists):', !!req.file);

    let imageURL = req.body.imageURL || '';

    // If file is uploaded and has a buffer (memoryStorage -> Google Drive), upload to Drive
    if (req.file && req.file.buffer) {
      const { uploadBufferToDrive } = require('../services/googleDrive');
      const ext = req.file.originalname.split('.').pop()
      const filename = `product-${Date.now()}.${ext}`
      const result = await uploadBufferToDrive(req.file.buffer, filename, req.file.mimetype)
      imageURL = result.webContentLink || result.webViewLink || imageURL
    } else if (req.file && req.file.path) {
      // If using Cloudinary storage, multer provides a `path` with the uploaded URL
      imageURL = req.file.path
    }

    // Normalize sizes: if sizes is a string (comma-separated or single), convert to array
    let sizes = req.body.sizes;
    if (!sizes) sizes = [];
    else if (typeof sizes === 'string') {
      // If sent as comma-separated string or a single value
      sizes = sizes.includes(',') ? sizes.split(',').map(s => s.trim()).filter(Boolean) : [sizes]
    }

    const productData = {
      ...req.body,
      sizes,
      imageURL
    };

    const product = await Product.create(productData);

    console.log('Product created:', product._id);

    // Return product wrapped in data for consistency with other endpoints
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        product
      }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating product'
    });
  }
};

// @desc    Update product
// @route   PUT /api/admin/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('updateProduct called for id:', id)
    console.log('updateProduct req.body keys:', Object.keys(req.body))
    if (req.file) console.log('updateProduct received req.file (exists):', !!req.file)

    const updateData = { ...req.body };

    // If a new file buffer is provided (Google Drive flow), upload and set imageURL
    if (req.file && req.file.buffer) {
      const { uploadBufferToDrive } = require('../services/googleDrive');
      const ext = req.file.originalname.split('.').pop()
      const filename = `product-${Date.now()}.${ext}`
      const result = await uploadBufferToDrive(req.file.buffer, filename, req.file.mimetype)
      updateData.imageURL = result.webContentLink || result.webViewLink || updateData.imageURL
    } else if (req.file && req.file.path) {
      updateData.imageURL = req.file.path
    }

    // Normalize sizes like in create
    let sizes = updateData.sizes;
    if (sizes && typeof sizes === 'string') {
      sizes = sizes.includes(',') ? sizes.split(',').map(s => s.trim()).filter(Boolean) : [sizes]
      updateData.sizes = sizes
    }

    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: {
        product
      }
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating product'
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/admin/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product'
    });
  }
};

// @desc    Bulk update inventory
// @route   PUT /api/admin/products/inventory/bulk
// @access  Private/Admin
const bulkUpdateInventory = async (req, res) => {
  try {
    const { updates } = req.body; // Array of { productId, stock } objects

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required and must not be empty'
      });
    }

    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { _id: update.productId },
        update: { stock: update.stock }
      }
    }));

    const result = await Product.bulkWrite(bulkOps);

    res.json({
      success: true,
      message: 'Inventory updated successfully',
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });
  } catch (error) {
    console.error('Bulk update inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating inventory'
    });
  }
};

// @desc    Get all orders with pagination and filtering
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      paymentStatus, 
      search, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    const query = {};
    
    if (status && status !== 'all') {
      query.orderStatus = status;
    }
    
    if (paymentStatus && paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus;
    }
    
    if (search) {
      query.$or = [
        { _id: { $regex: search, $options: 'i' } },
        { 'userId.name': { $regex: search, $options: 'i' } },
        { 'userId.email': { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const orders = await Order.find(query)
      .populate('userId', 'name email')
      .populate('products.productId', 'name imageURL')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders'
    });
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    const updateData = {};
    if (orderStatus) updateData.orderStatus = orderStatus;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    const order = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'name email')
     .populate('products.productId', 'name imageURL');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating order status'
    });
  }
};

// @desc    Get order details
// @route   GET /api/admin/orders/:id
// @access  Private/Admin
const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('userId', 'name email phone')
      .populate('products.productId', 'name imageURL price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order details'
    });
  }
};

// @desc    Get categories
// @route   GET /api/admin/categories
// @access  Private/Admin
const getCategories = async (req, res) => {
  try {
    // Use Category collection if present; otherwise derive categories from products
    const categories = await Category.find().lean();

    // If no categories seeded in Category collection, derive unique names from products
    let categoryList = categories;
    if (!categoryList || categoryList.length === 0) {
      const names = await Product.distinct('category');
      categoryList = names.map(n => ({ name: n, description: '' }));
    }

    const categoryStats = await Promise.all(
      categoryList.map(async (cat) => {
        const name = cat.name
        const count = await Product.countDocuments({ category: name });
        const outOfStock = await Product.countDocuments({ category: name, stock: 0 });
        return {
          name,
          description: cat.description || '',
          productCount: count,
          outOfStockCount: outOfStock
        };
      })
    );

    res.json({ success: true, data: categoryStats });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
};

// @desc    Create category
// @route   POST /api/admin/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });

    const existing = await Category.findOne({ name });
    if (existing) return res.status(400).json({ success: false, message: 'Category already exists' });

    const category = await Category.create({ name, description });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ success: false, message: 'Server error while creating category' });
  }
}

// @desc    Update category
// @route   PUT /api/admin/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const category = await Category.findByIdAndUpdate(id, { name, description }, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating category' });
  }
}

// @desc    Delete category
// @route   DELETE /api/admin/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting category' });
  }
}

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(query)
      .select('-password')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

module.exports = {
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
};
