var express = require('express');
var router = express.Router();
const Users = require('../models/Users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const passport = require('./passportConfig');
const speakeasy = require('speakeasy'); // Pour gérer TOTP
const QRCode = require('qrcode'); // Pour générer un QR code

const tokenBlacklist = new Set();

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

// Sign-in route
router.post('/signin', async (req, res) => {
  const { email, password, twoFactorCode } = req.body;

  // Valider le format de l'email
  if (!email || !email.endsWith('@esprit.tn')) {
    return res.status(400).json({ message: 'L\'email doit appartenir au domaine @esprit.tn' });
  }

  try {
    // Trouver l'utilisateur par email
    const user = await Users.findOne({ Email: email });
    if (!user) {
      return res.status(400).json({ message: 'Email ou mot de passe invalide' });
    }

    // Vérifier si l'utilisateur utilise Google
    if (user?.googleId) {
      return res.status(400).json({ message: 'Veuillez utiliser la connexion Google' });
    }

    // Vérifier si le compte est vérifié
    if (!user.verified) {
      return res.status(400).json({ message: 'Compte non vérifié. Veuillez vérifier votre email.' });
    }

    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1; // Incrémenter avec valeur par défaut
      console.log(`Tentative échouée pour ${email}. Tentatives: ${user.loginAttempts}`); // Log
      await user.save();

      // Vérifier si le nombre de tentatives atteint 3
      if (user.loginAttempts >= 3) {
        console.log(`3 tentatives atteintes pour ${email}. Activation de la 2FA.`); // Log
        const secret = speakeasy.generateSecret({ name: `Esprit:${email}` }); // Nom pour l'app
        user.twoFactorSecret = secret.base32;
        user.twoFactorEnabled = true;
        user.loginAttempts = 0; // Réinitialiser les tentatives
        await user.save();

        // Générer le QR code
        const otpauthUrl = secret.otpauth_url;
        const qrCodeData = await QRCode.toDataURL(otpauthUrl);

        return res.status(400).json({
          message: 'Trop de tentatives échouées. La 2FA a été activée.',
          qrCodeData,
          manualCode: secret.base32,
        });
      }

      return res.status(400).json({
        message: 'Email ou mot de passe invalide',
        remainingAttempts: 3 - user.loginAttempts,
      });
    }

    // Réinitialiser les tentatives en cas de succès
    if (user.loginAttempts > 0) {
      user.loginAttempts = 0;
      await user.save();
    }

    // Vérifier si la 2FA est activée
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res.status(400).json({ message: 'Code d\'authentification à deux facteurs requis.' });
      }

      // Vérifier le code TOTP
      const isValidCode = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 1, // Tolérance de 30s avant/après
      });

      if (!isValidCode) {
        return res.status(400).json({ message: 'Code d\'authentification à deux facteurs invalide.' });
      }
    }

    // Générer le JWT
    const token = jwt.sign(
      { userId: user._id, email: user.Email, roles: user.Role, identifiant: user.Identifiant },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Erreur de connexion :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour configurer la 2FA manuellement
router.post('/setup-2fa', async (req, res) => {
  const { userId } = req.body;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'ID utilisateur invalide' });
  }

  try {
    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const secret = speakeasy.generateSecret({ name: `Esprit:${user.Email}` });
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;
    await user.save();

    const otpauthUrl = secret.otpauth_url;
    const qrCodeData = await QRCode.toDataURL(otpauthUrl);

    res.status(200).json({ qrCodeData, manualCode: secret.base32 });
  } catch (error) {
    console.error('Erreur lors de la configuration 2FA :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour désactiver la 2FA
router.post('/disable-2fa', async (req, res) => {
  const { userId } = req.body;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'ID utilisateur invalide' });
  }

  try {
    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    user.twoFactorSecret = null;
    user.twoFactorEnabled = false;
    await user.save();

    res.status(200).json({ message: 'Authentification à deux facteurs désactivée.' });
  } catch (error) {
    console.error('Erreur lors de la désactivation 2FA :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour la connexion Google
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback Google
router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const user = req.user;
      res.redirect(`http://localhost:3000/tivo/authentication/register-bg-img?userId=${user._id}`);
    } catch (error) {
      console.error('Erreur callback Google :', error);
      res.redirect('/login?error=google_auth_failed');
    }
  }
);

// Route pour compléter l'inscription
router.post('/complete-registration', async (req, res) => {
  const { userId, identifiant, classe, role, phoneNumber } = req.body;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'ID utilisateur invalide' });
  }

  try {
    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    user.Identifiant = identifiant || user.Identifiant;
    user.Classe = classe || user.Classe;
    user.Role = role || user.Role;
    user.PhoneNumber = phoneNumber || user.PhoneNumber;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.Email, roles: user.Role, identifiant: user.Identifiant },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token });
  } catch (error) {
    console.error('Erreur lors de la complétion de l\'inscription :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route de déconnexion
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ message: 'Token manquant ou invalide' });
  }

  const token = authHeader.split(' ')[1];
  tokenBlacklist.add(token);
  res.status(200).json({ message: 'Déconnexion réussie.' });
});

// Middleware pour vérifier les tokens blacklistés
function checkTokenBlacklist(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant ou invalide' });
  }

  const token = authHeader.split(' ')[1];
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ message: 'Token blacklisté' });
  }
  next();
}

// Route protégée
router.use('/protected', checkTokenBlacklist, (req, res) => {
  res.send('Ceci est une route protégée');
});

module.exports = router;