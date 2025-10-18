const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const checkAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/algud';
    console.log(`Connecting to MongoDB: ${mongoURI}`);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@algud.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found! Creating new admin user...');
      
      // Create admin user
      const newAdmin = await User.create({
        name: 'Admin User',
        email: 'admin@algud.com',
        password: 'Algud@admin',
        role: 'admin'
      });
      
      console.log('✅ Admin user created successfully!');
      console.log('Email:', newAdmin.email);
      console.log('Role:', newAdmin.role);
      console.log('ID:', newAdmin._id);
    } else {
      console.log('✅ Admin user found:');
      console.log('Email:', adminUser.email);
      console.log('Name:', adminUser.name);
      console.log('Role:', adminUser.role);
      console.log('ID:', adminUser._id);
      
      // Test password
      const isPasswordValid = await adminUser.matchPassword('Algud@admin');
      console.log('Password test (Algud@admin):', isPasswordValid ? '✅ Valid' : '❌ Invalid');
      
      if (!isPasswordValid) {
        console.log('🔧 Resetting admin password...');
        adminUser.password = 'Algud@admin';
        await adminUser.save();
        console.log('✅ Admin password reset successfully!');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the check
checkAdmin();

