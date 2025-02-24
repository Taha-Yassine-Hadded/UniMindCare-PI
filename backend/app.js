// filepath: /C:/Users/ferie/OneDrive/Bureau/uni/UniMindCare-PI-main/backend/app.js
const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const twoFactorRoutes = require("./routes/twoFactorRoutes");
const cors = require('cors');
dotenv.config();
connectDB();

const app = express();
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/2fa", twoFactorRoutes);

app.use(cors({
  origin: 'http://localhost:3000', // Autoriser uniquement le frontend
  credentials: true,
}));

// Route login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (email === 'user@example.com' && password === 'votre_mot_de_passe') {
      res.status(200).json({ message: 'Login réussi', token: 'votre_jwt_token' });
  } else {
      res.status(401).json({ message: 'Identifiants incorrects' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));