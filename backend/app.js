const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db"); // Import database configuration
const authRoutes = require("./routes/authRoutes"); // Authentication routes
const cors = require("cors");


dotenv.config(); // Load environment variables from .env
connectDB(); // Connect to the database

const app = express();

// Middleware
app.use(express.json()); // Parse JSON data
app.use(cors()); // Allow all origins (can be restricted if needed)

// Routes
app.use("/api/auth", authRoutes); // Authentication routes

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Erreur serveur" });
});



module.exports = app;
