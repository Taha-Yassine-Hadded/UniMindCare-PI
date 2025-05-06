const express = require("express");
const router = express.Router();
const User = require("../Models/Users");
const { transporter } = require("../config/emailConfig");
const loginLink = "http://localhost:3000/tivo/authentication/login-simple";
const bcrypt = require("bcryptjs");
const { validateToken } = require('../middleware/authentication');
const multer = require('multer');
const { bucket } = require('../firebase');
const Post = require('../Models/Post');
const passport = require('./passportConfig');
const InappropriateComment = require('../Models/InappropriateComment');
const validator = require('validator');

// Multer config: only JPEG/PNG, 5MB max
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Seules les images JPEG et PNG sont autorisées'));
  },
});

// Helper: Validate email
function isValidEspritEmail(email) {
  return typeof email === 'string' && email.endsWith('@esprit.tn') && validator.isEmail(email);
}

// Helper: Validate password strength
function isStrongPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

// Helper: Validate phone number
function isValidPhone(phone) {
  return typeof phone === 'string' && validator.isMobilePhone(phone, 'any');
}

// Helper: Validate role
function isValidRole(role) {
  const allowed = ['student', 'admin', 'teacher', 'psychologist', 'psychiatre'];
  if (Array.isArray(role)) return role.every(r => allowed.includes(r));
  return allowed.includes(role);
}

// GET /auth/me - Authenticated user info
router.get('/auth/me', validateToken, async (req, res) => {
  try {
    res.json({ userId: req.user.userId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /add - Add new user
router.post("/add", async (req, res) => {
  try {
    const { Name, Identifiant, Email, Password, Classe, Role, PhoneNumber, Enabled = true } = req.body;

    // Validate inputs
    if (!Name || !Identifiant || !Email || !Password || !Role || !PhoneNumber) {
      return res.status(400).json({ message: "Tous les champs requis doivent être fournis" });
    }
    if (!isValidEspritEmail(Email)) {
      return res.status(400).json({ message: "L'email doit être une adresse esprit.tn valide" });
    }
    if (!isStrongPassword(Password)) {
      return res.status(400).json({ message: "Le mot de passe doit contenir au moins 8 caractères" });
    }
    if (!isValidPhone(PhoneNumber)) {
      return res.status(400).json({ message: "Numéro de téléphone invalide" });
    }
    if (!isValidRole(Role)) {
      return res.status(400).json({ message: "Rôle invalide" });
    }
    if (!validator.isAlphanumeric(Identifiant)) {
      return res.status(400).json({ message: "Identifiant doit être alphanumérique" });
    }

    // Check existing user
    const existingUser = await User.findOne({ $or: [{ Email }, { Identifiant }] });
    if (existingUser) {
      return res.status(409).json({ message: "Un utilisateur avec cet email ou identifiant existe déjà" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(Password, 10);

    // Create user
    const newUser = new User({
      Name,
      Identifiant,
      Email,
      Password: hashedPassword,
      Classe: (Array.isArray(Role) ? Role : [Role]).includes("student") ? Classe : "",
      Role: Array.isArray(Role) ? Role : [Role],
      PhoneNumber,
      imageUrl: "",
      verified: true,
      enabled: Enabled,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedUser = await newUser.save();

    // Send email
    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: savedUser.Email,
      subject: "Compte créé",
      html: `<p>Votre compte a été créé avec succès. Cliquez ici pour vous connecter :</p><a href="${loginLink}">Connexion UniMindCare</a>`,
    };
    await transporter.sendMail(mailOptions);

    res.status(201).json(savedUser);
  } catch (error) {
    console.error("Erreur ajout utilisateur:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET / - Get all users (admin)
router.get("/", passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.user.Role || !req.user.Role.includes('admin')) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    const users = await User.find({});
    res.status(200).json(users);
  } catch (error) {
    console.error("Erreur récupération utilisateurs:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /disabled - Get disabled users (admin)
router.get("/disabled", passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.user.Role || !req.user.Role.includes('admin')) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    const users = await User.find({ enabled: false });
    res.status(200).json(users);
  } catch (error) {
    console.error("Erreur récupération utilisateurs désactivés:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PUT /enable/:id - Enable user (admin)
router.put("/enable/:id", passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.user.Role || !req.user.Role.includes('admin')) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    if (!validator.isMongoId(req.params.id)) {
      return res.status(400).json({ message: "ID invalide" });
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { enabled: true } },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Send email
    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: updatedUser.Email,
      subject: "Compte activé",
      html: `<p>Cliquez ici pour accéder à votre compte :</p><a href="${loginLink}">Connexion UniMindCare</a>`,
    };
    await transporter.sendMail(mailOptions);

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Erreur activation utilisateur:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PUT /disable/:id - Disable user (admin)
router.put("/disable/:id", passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.user.Role || !req.user.Role.includes('admin')) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    if (!validator.isMongoId(req.params.id)) {
      return res.status(400).json({ message: "ID invalide" });
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { enabled: false } },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Send email
    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: updatedUser.Email,
      subject: "Compte désactivé",
      html: "<p>Votre compte a été désactivé par l'administration. Contactez-les pour plus d'informations.</p>",
    };
    await transporter.sendMail(mailOptions);

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Erreur désactivation utilisateur:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PUT /:identifiant/upload-profile-picture - Upload profile picture
router.put('/:identifiant/upload-profile-picture', validateToken, upload.single('profilePicture'), async (req, res) => {
  try {
    const { identifiant } = req.params;
    if (!validator.isAlphanumeric(identifiant)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune image fournie' });
    }
    const user = await User.findOne({ Identifiant: identifiant });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    const fileName = `users/${identifiant}/profile/${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '')}`;
    const file = bucket.file(fileName);
    const stream = file.createWriteStream({
      metadata: { contentType: req.file.mimetype },
    });

    stream.on('error', (err) => {
      console.error('Erreur upload Firebase:', err);
      res.status(500).json({ message: 'Erreur upload image' });
    });
    stream.on('finish', async () => {
      await file.makePublic();
      const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      user.imageUrl = imageUrl;
      user.updatedAt = new Date();
      const updatedUser = await user.save();
      res.status(200).json(updatedUser);
    });
    stream.end(req.file.buffer);
  } catch (error) {
    console.error('Erreur mise à jour image profil:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT /:identifiant - Update user password
router.put("/:identifiant", validateToken, async (req, res) => {
  try {
    const { identifiant } = req.params;
    const { currentPassword, newPassword } = req.body;
    if (!validator.isAlphanumeric(identifiant)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    const user = await User.findOne({ Identifiant: identifiant });
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    if (!newPassword) {
      return res.status(400).json({ message: "Nouveau mot de passe requis" });
    }
    if (!currentPassword) {
      return res.status(400).json({ message: "Mot de passe actuel requis" });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.Password);
    if (!isMatch) {
      return res.status(401).json({ message: "Mot de passe actuel incorrect" });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: "Nouveau mot de passe doit contenir au moins 8 caractères" });
    }

    user.Password = await bcrypt.hash(newPassword, 10);
    user.updatedAt = new Date();
    const updated = await user.save();
    res.status(200).json(updated);
  } catch (error) {
    console.error("Erreur mise à jour mot de passe:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /admin - Get users with inappropriate comment counts (admin)
router.get('/admin', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.user.Role || !req.user.Role.includes('admin')) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    const users = await User.find({}, {
      Name: 1,
      Email: 1,
      Role: 1,
      enabled: 1,
      inappropriateCommentsCount: 1,
      lastInappropriateComment: 1,
    }).sort({ inappropriateCommentsCount: -1 });
    res.status(200).json(users);
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /:id/bad-comments - Get bad comments for a user (admin)
router.get('/:id/bad-comments', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.user.Role || !req.user.Role.includes('admin')) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    if (!validator.isMongoId(req.params.id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }
    const inappropriateComments = await InappropriateComment.find({ author: req.params.id }).sort({ createdAt: -1 });
    const posts = await Post.find({ 'comments.author': req.params.id });
    const flaggedComments = [];
    posts.forEach(post => {
      post.comments.forEach(comment => {
        if (comment.author.toString() === req.params.id && comment.isInappropriate) {
          flaggedComments.push({
            _id: comment._id,
            content: comment.content,
            createdAt: comment.createdAt,
            flaggedAt: comment.flaggedAt,
            flagReason: comment.flagReason,
            postId: post._id,
            postTitle: post.title,
          });
        }
      });
    });
    const allBadComments = [
      ...inappropriateComments.map(comment => ({
        _id: comment._id,
        content: comment.content,
        createdAt: comment.createdAt,
        postId: comment.postId,
        postTitle: comment.postTitle,
        flagReason: comment.reason,
        type: 'Bloqué',
      })),
      ...flaggedComments.map(comment => ({
        ...comment,
        type: 'Signalé',
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Synchronous
    res.status(200).json(allBadComments);
  } catch (error) {
    console.error('Erreur récupération commentaires inappropriés:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT /:id/status - Toggle user status (admin)
router.put('/:id/status', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.user.Role || !req.user.Role.includes('admin')) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    if (!validator.isMongoId(req.params.id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }
    const { enabled } = req.body;
    if (enabled === undefined) {
      return res.status(400).json({ message: 'Statut enabled requis' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const isReactivation = !user.enabled && enabled === true; // Synchronous
    user.enabled = enabled; // Synchronous
    if (enabled === true) {
      user.inappropriateCommentsCount = 0;
      user.lastInappropriateComment = null;
    }
    await user.save();

    if (isReactivation) {
      try {
        const mailOptions = {
          from: `"UniMindCare Administration" <${process.env.EMAIL_USER}>`,
          to: user.Email,
          subject: 'Compte réactivé - AVERTISSEMENT',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <h2 style="color: #1976d2;">Compte réactivé</h2>
              <p>Cher(e) ${user.Name},</p>
              <p>Votre compte UniMindCare a été réactivé par l'administrateur.</p>
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 15px 0; color: #856404;">
                <h3 style="margin-top: 0;">⚠️ AVERTISSEMENT</h3>
                <p>Votre compte a été désactivé pour des commentaires inappropriés.</p>
                <p>Tout contenu offensant ou nuisible est interdit.</p>
                <p><strong>En cas de récidive :</strong></p>
                <ul>
                  <li>Compte définitivement désactivé</li>
                  <li>Mesures disciplinaires supplémentaires</li>
                </ul>
              </div>
              <p>Consultez nos <a href="http://localhost:3000/blog" style="color: #1976d2;">règles communautaires</a>.</p>
              <p>Contactez l'administration pour toute question.</p>
              <p style="margin-top: 20px;">Cordialement,<br>L'équipe UniMindCare</p>
            </div>
          `,
        };
        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error('Erreur envoi email réactivation:', emailError);
      }
    }

    res.status(200).json({
      message: `Utilisateur ${enabled ? 'activé' : 'désactivé'} avec succès${enabled ? ' et compteur réinitialisé' : ''}`,
      user: {
        _id: user._id,
        Name: user.Name,
        Email: user.Email,
        enabled: user.enabled,
        inappropriateCommentsCount: user.inappropriateCommentsCount,
        Role: user.Role,
      },
    });
  } catch (error) {
    console.error('Erreur mise à jour statut:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;