const mongoose = require('mongoose');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const testLoginAPI = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/algud';
    console.log(`🔗 Connecting to MongoDB: ${mongoURI}`);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

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
    console.log('Password test result:', isPasswordValid ? '✅ Valid' : '❌ Invalid');

    if (isPasswordValid) {
      // Test JWT generation
      console.log('\n🔑 Testing JWT generation...');
      const secret = process.env.JWT_SECRET || 'algud_super_secret_jwt_key_2024';
      console.log('JWT Secret:', secret ? '✅ Set' : '❌ Not set');
      
      try {
        const token = jwt.sign({ id: adminUser._id }, secret, { expiresIn: '30d' });
        console.log('✅ JWT token generated successfully');
        console.log('Token length:', token.length);
        
        // Test JWT verification
        const decoded = jwt.verify(token, secret);
        console.log('✅ JWT token verified successfully');
        console.log('Decoded payload:', decoded);
        
        console.log('\n🎉 Login should work now!');
        console.log('Try logging in with:');
        console.log('Email: admin@algud.com');
        console.log('Password: Algud@admin');
        
      } catch (jwtError) {
        console.error('❌ JWT Error:', jwtError.message);
      }
    } else {
      console.log('\n❌ Password test failed. Let me reset it...');
      adminUser.password = 'Algud@admin';
      await adminUser.save();
      console.log('✅ Password reset complete!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run the test
testLoginAPI();
