const jwt = require('jsonwebtoken');

// Generate JWT for a user
module.exports = function generateToken(id) {
  const secret = process.env.JWT_SECRET || 'algud_super_secret_jwt_key_2024';
  return jwt.sign({ id }, secret, { expiresIn: '30d' });
};
