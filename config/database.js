const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/algud';
    console.log(`Connecting to MongoDB: ${mongoURI}`);
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.log('💡 Make sure MongoDB is running on your system');
    console.log('💡 You can install MongoDB locally or use MongoDB Atlas');
    process.exit(1);
  }
};

module.exports = connectDB;
