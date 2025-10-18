const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const setupAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/algud';
    console.log(`Connecting to MongoDB: ${mongoURI}`);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@algud.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return;
    }

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@algud.com',
      password: 'Algud@admin',
      role: 'admin'
    });

    console.log('Admin user created successfully:');
    console.log('Email: admin@algud.com');
    console.log('Password: Algud@admin');
    console.log('Role: admin');
    console.log('ID:', adminUser._id);

  } catch (error) {
    console.error('Error setting up admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the setup
setupAdmin();
