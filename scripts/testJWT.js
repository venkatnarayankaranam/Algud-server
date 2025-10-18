const jwt = require('jsonwebtoken');
require('dotenv').config();

const testJWT = () => {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'algud_super_secret_jwt_key_2024';
    console.log('JWT_SECRET:', JWT_SECRET ? '✅ Set' : '❌ Not set');
    
    // Test JWT generation
    const testPayload = { id: '68d184ea2f0be8bac77cb0bf' };
    const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '30d' });
    
    console.log('✅ JWT token generated successfully');
    console.log('Token length:', token.length);
    
    // Test JWT verification
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ JWT token verified successfully');
    console.log('Decoded payload:', decoded);
    
  } catch (error) {
    console.error('❌ JWT Error:', error.message);
  }
};

testJWT();

