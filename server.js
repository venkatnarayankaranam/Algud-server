// const express = require('express');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const connectDB = require('./config/database');
// const errorHandler = require('./middleware/errorHandler');

// // Load environment variables
// dotenv.config();

// // Connect to database
// connectDB();

// const app = express();

// // Middleware
// const cookieParser = require('cookie-parser')
// const CLIENT_URL = process.env.CLIENT_URL || 'http://https://algud-iota.vercel.app'
// app.use(cors({
//   origin: CLIENT_URL,
//   methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//   credentials: true
// }));
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser())

// // Passport for OAuth
// const passport = require('passport')
// const configurePassport = require('./config/passport')
// configurePassport()
// app.use(passport.initialize())

// // Set COOP to allow popups to communicate via postMessage when frontend
// // and external iframes need to interact (e.g. Google Identity SDK).
// // This is safe for same-origin deployments and allows popups to return
// // messages back to the opener. If you host the client via Vite during
// // development this header won't affect the dev server responses.
// // Optionally set COOP header to allow popups to communicate via postMessage
// // Set COOP_ALLOW_POPUPS=false in the environment to disable this header.


// // Routes
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/products', require('./routes/products'));
// app.use('/api/orders', require('./routes/orders'));
// app.use('/api/payment', require('./routes/payment'));
// app.use('/api/admin', require('./routes/admin'));
// app.use('/api/upload', require('./routes/upload'));

// // Health check endpoint
// app.get('/api/health', (req, res) => {
//   res.json({
//     success: true,
//     message: 'ALGUD API is running',
//     timestamp: new Date().toISOString()
//   });
// });

// // Error handling middleware
// app.use(errorHandler);

// // 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Route not found'
//   });
// });

// const PORT = parseInt(process.env.PORT, 10) || 5000;
// const MAX_RETRIES = 10; // how many ports to try before giving up

// // Start server and attempt port fallback if the requested port is already in use.
// function startServer(port, retriesLeft = MAX_RETRIES) {
//   const server = app.listen(port, () => {
//     console.log(`🚀 ALGUD Server running on port ${port}`);
//     console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
//     console.log(`🔗 Health check: http://localhost:${port}/api/health`);
//   });

//   server.on('error', (err) => {
//     if (err && err.code === 'EADDRINUSE') {
//       console.error(`Port ${port} is already in use.`);
//       if (retriesLeft > 0) {
//         const nextPort = port + 1;
//         console.log(`Trying port ${nextPort} (${retriesLeft - 1} retries left)...`);
//         // Close current server and try the next port
//         try {
//           server.close(() => startServer(nextPort, retriesLeft - 1));
//         } catch (closeErr) {
//           // If close errors, still attempt next port after a short delay
//           setTimeout(() => startServer(nextPort, retriesLeft - 1), 200);
//         }
//         return;
//       }
//       console.error('No available ports found. Exiting.');
//       process.exit(1);
//     }
//     // Unexpected error - rethrow so we get a full stack trace
//     throw err;
//   });
// }

// startServer(PORT);



const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const configurePassport = require('./config/passport');

dotenv.config();
connectDB();

const app = express();

// ---------- TRUST REVERSE PROXY (Render / Vercel) ----------
app.set("trust proxy", 1);

// ---------- ALLOWED ORIGINS ----------
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://algud-iota.vercel.app"
];

// ---------- CORS FIX (COOKIE SAFE) ----------
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");

  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ---------- BODY PARSERS ----------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---------- PASSPORT / GOOGLE OAUTH ----------
configurePassport();
app.use(passport.initialize());

// ---------- DEBUG LOGGING ----------
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.originalUrl}`);
  next();
});

// ---------- ROUTES ----------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ALGUD API is running',
    timestamp: new Date().toISOString()
  });
});

// Root
app.get('/', (req, res) => {
  res.send('🚀 ALGUD Backend is live!');
});

// Error handling
app.use(errorHandler);

// 404 fallback
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ---------- SERVER START ----------
const PORT = parseInt(process.env.PORT, 10) || 5000;
const MAX_RETRIES = 10;

function startServer(port, retriesLeft = MAX_RETRIES) {
  const server = app.listen(port, () => {
    console.log(`🚀 ALGUD Server running on port ${port}`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      if (retriesLeft > 0) {
        const nextPort = port + 1;
        console.log(`Port ${port} in use. Trying ${nextPort}...`);
        server.close(() => startServer(nextPort, retriesLeft - 1));
        return;
      }
      console.error('No free ports. Exiting.');
      process.exit(1);
    }
    throw err;
  });
}

startServer(PORT);
