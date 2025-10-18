const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const fixAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/algud';
    console.log(`🔗 Connecting to MongoDB: ${mongoURI}`);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Delete existing admin user if exists
    const existingAdmin = await User.findOne({ email: 'admin@algud.com' });
    if (existingAdmin) {
      console.log('🗑️ Removing existing admin user...');
      await User.deleteOne({ email: 'admin@algud.com' });
      console.log('✅ Existing admin user removed');
    }

    // Create new admin user - let the pre-save hook handle password hashing
    console.log('👤 Creating new admin user...');
    
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@algud.com',
      password: 'Algud@admin', // Let the pre-save hook hash this
      role: 'admin'
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@algud.com');
    console.log('🔑 Password: Algud@admin');
    console.log('👑 Role: admin');
    console.log('🆔 ID:', adminUser._id);

    // Test the password
    console.log('\n🔐 Testing password...');
    const isPasswordValid = await adminUser.matchPassword('Algud@admin');
    console.log('Password test result:', isPasswordValid ? '✅ Valid' : '❌ Invalid');

    if (isPasswordValid) {
      console.log('\n🎉 Admin setup completed successfully!');
      console.log('You can now login with:');
      console.log('Email: admin@algud.com');
      console.log('Password: Algud@admin');
    } else {
      console.log('\n❌ Password test failed. Let me try a different approach...');
      
      // Try to update the password directly
      adminUser.password = 'Algud@admin';
      await adminUser.save();
      
      console.log('🔄 Password updated, testing again...');
      const retestPassword = await adminUser.matchPassword('Algud@admin');
      console.log('Retest result:', retestPassword ? '✅ Valid' : '❌ Invalid');
    }

  } catch (error) {
    console.error('❌ Error setting up admin:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run the setup
fixAdmin();
