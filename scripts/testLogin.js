const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const testLogin = async () => {
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
      console.log('❌ Admin user not found!');
      return;
    }

    console.log('✅ Admin user found:');
    console.log('Email:', adminUser.email);
    console.log('Name:', adminUser.name);
    console.log('Role:', adminUser.role);
    console.log('ID:', adminUser._id);

    // Test password
    console.log('\n🔐 Testing password...');
    const isPasswordValid = await adminUser.matchPassword('Algud@admin');
    console.log('Password test (Algud@admin):', isPasswordValid ? '✅ Valid' : '❌ Invalid');

    if (isPasswordValid) {
      console.log('\n🎉 Admin login should work now!');
      console.log('Try logging in with:');
      console.log('Email: admin@algud.com');
      console.log('Password: Algud@admin');
    } else {
      console.log('\n❌ Password is still invalid. Let me reset it...');
      adminUser.password = 'Algud@admin';
      await adminUser.save();
      console.log('✅ Password reset complete!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the test
testLogin();

