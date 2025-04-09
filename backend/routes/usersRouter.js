var express = require('express');
var router = express.Router();
const Users = require('../Models/Users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const passport = require('./passportConfig');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const tokenBlacklist = new Set();

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

// Sign-in route
router.post('/signin', async (req, res) => {
  const { email, password, twoFactorCode } = req.body;

  console.log('Payload reçu:', { email, password, twoFactorCode });

  if (!email || !email.endsWith('@esprit.tn')) {
    console.log('Erreur: Email invalide');
    return res.status(400).json({ message: "L'email doit appartenir au domaine @esprit.tn" });
  }

  try {
    const user = await Users.findOne({ Email: email });
    console.log('Utilisateur trouvé:', user ? user : 'Aucun utilisateur');
    if (!user) {
      return res.status(400).json({ message: 'Email ou mot de passe invalide' });
    }

    if (user?.googleId) {
      console.log('Erreur: Compte Google détecté');
      return res.status(400).json({ message: 'Veuillez utiliser la connexion Google' });
    }

    if (!user.verified) {
      console.log('Erreur: Compte non vérifié');
      return res.status(400).json({ message: 'Compte non vérifié. Veuillez vérifier votre email.' });
    }

    // Check if user is verified
    if (!user.enabled) {
      return res.status(400).json({ message: "Account disabled for the moment ! Please wait until the admin confirms your informations." });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.Password);
    console.log('Mot de passe correspond:', isPasswordMatch);

    let isAuthenticated = false;

    // Si le mot de passe est correct, pas besoin de vérifier le 2FA
    if (isPasswordMatch) {
      isAuthenticated = true;
    } 
    // Si le mot de passe est incorrect, vérifier le 2FA comme fallback
    else if (user.twoFactorEnabled) {
      console.log('Mot de passe incorrect, vérification 2FA activée, code reçu:', twoFactorCode);

      if (!twoFactorCode) {
        return res.status(400).json({
          message: "Mot de passe incorrect. Code d'authentification à deux facteurs requis.",
          twoFactorRequired: true,
        });
      }

      if (!/^\d{6}$/.test(twoFactorCode)) {
        console.log('Erreur: Format 2FA invalide');
        return res.status(400).json({ message: "Le code 2FA doit être un nombre à 6 chiffres." });
      }

      // Comme demandé précédemment, tout code à 6 chiffres est accepté
      console.log('Code 2FA accepté:', twoFactorCode);
      isAuthenticated = true; // Authentification réussie via 2FA
    }

    // Si ni le mot de passe ni le 2FA (si activé) ne permettent l'authentification
    if (!isAuthenticated) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      console.log(`Tentative échouée pour ${email}. Tentatives: ${user.loginAttempts}`);
      await user.save();

      return res.status(400).json({
        message: 'Email, mot de passe ou code 2FA invalide',
        remainingAttempts: 3 - user.loginAttempts,
      });
    }

    // Réinitialiser les tentatives après une authentification réussie
    user.loginAttempts = 0;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.Email, roles: user.Role, identifiant: user.Identifiant },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Token généré:', token);
    console.log('Données utilisateur renvoyées:', {
      _id: user._id,
      Name: user.Name,
      Identifiant: user.Identifiant,
      Email: user.Email,
      Classe: user.Classe,
      Role: user.Role,
      PhoneNumber: user.PhoneNumber,
      imageUrl: user.imageUrl || '/defaultProfile.png',
      twoFactorEnabled: user.twoFactorEnabled || false,
    });
    res.json({
      token,
      user: {
        _id: user._id, // Inclusion explicite de _id
        Name: user.Name,
        Identifiant: user.Identifiant,
        Email: user.Email,
        Classe: user.Classe,
        Role: user.Role,
        PhoneNumber: user.PhoneNumber,
        imageUrl: user.imageUrl || '/defaultProfile.png',
        twoFactorEnabled: user.twoFactorEnabled || false,
      },
    });
  } catch (error) {
    console.error('Erreur de connexion :', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour configurer la 2FA
router.post('/setup-2fa', async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const secret = speakeasy.generateSecret({ name: `Esprit:${user.Email}` });
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = true;
    await user.save();

    const qrCodeData = await QRCode.toDataURL(secret.otpauth_url);
    console.log('Secret 2FA généré:', secret.base32);

    res.status(200).json({ qrCodeData, manualCode: secret.base32 });
  } catch (error) {
    console.error('Erreur lors de la configuration 2FA:', error);
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