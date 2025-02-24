const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db"); // Import database configuration
const authRoutes = require("./routes/authRoutes"); // Authentication routes
const twoFactorRoutes = require("./routes/twoFactorRoutes"); // 2FA routes
const cors = require("cors");

dotenv.config(); // Load environment variables from .env
connectDB(); // Connect to the database

const app = express();

// Middleware
app.use(express.json()); // Parse JSON data
app.use(cors()); // Allow all origins (can be restricted if needed)

// Routes
app.use("/api/auth", authRoutes); // Authentication routes
app.use("/api/two-factor", twoFactorRoutes); // 2FA routes (renamed for clarity)

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  // Example check (replace with actual database check)
  if (email === "user@example.com" && password === "votre_mot_de_passe") {
    // Generate and return JWT token on success (replace with actual token generation)
    res.status(200).json({ message: "Login réussi", token: "votre_jwt_token" });
  } else {
    res.status(401).json({ message: "Identifiants incorrects" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Erreur serveur" });
});

// Export the app for use in other files (like bin/www)
module.exports = app;
