// filepath: /C:/Users/ferie/OneDrive/Bureau/uni/UniMindCare-PI-main/backend/controllers/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

exports.register = async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send("L'utilisateur avec cet email existe déjà.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = new User({
      email,
      password: hashedPassword,
      is2FAEnabled: false, // Par défaut, 2FA est désactivé
    });

    // Sauvegarder l'utilisateur dans la base de données
    await user.save();

    res.status(201).send("Utilisateur enregistré !");
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de l'utilisateur:", error);
    res.status(500).send("Erreur serveur : " + error.message);
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send("Utilisateur introuvable");

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).send("Mot de passe invalide");

    if (user.is2FAEnabled) {
      return res.json({ message: "2FA requis", userId: user._id });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  } catch (error) {
    res.status(500).send("Erreur serveur : " + error.message);
  }
};