


const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/database");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const configurePassport = require("./config/passport");
const errorHandler = require("./middleware/errorHandler");

dotenv.config();
connectDB();

const app = express();

// Trust Reverse Proxy (Required on Render/Vercel to allow Secure Cookies)
app.set("trust proxy", 1);

// ---------------- ALLOWED FRONTEND ORIGINS ----------------
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://algud-swart.vercel.app",
  "https://algud.in",
  "https://www.algud.in"
];

// ---------------- CORS ----------------
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        callback(new Error("CORS blocked origin: " + origin));
      }
    },
    credentials: true,
    methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"]
  })
);

// Handle preflight requests
app.options("*", cors());

// ---------------- BODY PARSERS ----------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---------------- PASSPORT ----------------
configurePassport();
app.use(passport.initialize());

// ---------------- DEBUG LOG ----------------
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

// ---------------- ROUTES ----------------
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/wishlist", require("./routes/wishlist"));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "ALGUD API is running",
    timestamp: new Date().toISOString()
  });
});

// Root
app.get("/", (req, res) => {
  res.send("🚀 ALGUD Backend is live!");
});

// Error handler
app.use(errorHandler);

// 404 fallback
app.use("*", (req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 ALGUD Server running on port ${PORT}`);
});
