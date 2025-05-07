const express = require('express');
const router = express.Router();
const User = require('../Models/Users');
const Post = require('../Models/Post');
const InappropriateComment = require('../Models/InappropriateComment');
const { transporter } = require('../config/emailConfig');
const loginLink = 'http://localhost:3000/tivo/authentication/login-simple';
const bcrypt = require('bcryptjs');
const { validateToken } = require('../middleware/authentication');
const multer = require('multer');
const { bucket } = require('../firebase');
const passport = require('./passportConfig');
const validator = require('validator');

// Multer config: JPEG/PNG, 2MB max
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Seules les images JPEG et PNG sont autorisées'), false);
    }
    const buffer = file.buffer || Buffer.alloc(0);
    const isValidImage =
      (file.mimetype === 'image/jpeg' && buffer.slice(0, 3).toString('hex') === 'ffd8ff') ||
      (file.mimetype === 'image/png' && buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a');
    if (!isValidImage) {
      return cb(new Error('Fichier image invalide ou corrompu'), false);
    }
    cb(null, true);
  },
});

// Validation helpers
const isValidEspritEmail = (email) => typeof email === 'string' && email.endsWith('@esprit.tn') && validator.isEmail(email);
const isStrongPassword = (password) => typeof password === 'string' && password.length >= 8;
const isValidPhone = (phone) => typeof phone === 'string' && validator.isMobilePhone(phone, 'any');
const isValidRole = (role) => {
  const allowed = ['student', 'admin', 'teacher', 'psychologist', 'psychiatre'];
  return Array.isArray(role) ? role.every(r => allowed.includes(r)) : allowed.includes(role);
};
const sanitizeInput = (input) => validator.escape(validator.trim(input));

// Email helper
const sendEmail = async (to, subject, content, isHtml = false) => {
  const mailOptions = {
    from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    [isHtml ? 'html' : 'text']: content,
  };
  await transporter.sendMail(mailOptions);
};

// Admin check helper
const restrictToAdmin = (req, res, next) => {
  if (!req.user?.Role?.includes('admin')) {
    return res.status(403).json({ message: 'Accès non autorisé' });
  }
  next();
};

// Error handling wrapper
const handleAsync = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error(`Erreur: ${error.message}`, error);
    res.status(
      error.message.includes('invalide') || error.message.includes('requis') ? 400 :
      error.message.includes('non trouvé') ? 404 :
      error.message.includes('existe déjà') ? 409 :
      error.message.includes('incorrect') ? 401 :
      error.message.includes('non autorisé') ? 403 : 500
    ).json({ message: error.message });
  }
};

// GET /auth/me
router.get('/auth/me', validateToken, handleAsync(async (req, res) => {
  res.json({ userId: req.user.userId });
}));

// POST /add
router.post('/add', handleAsync(async (req, res) => {
  const { Name, Identifiant, Email, Password, Classe, Role, PhoneNumber, Enabled = true } = req.body;

  if (!Name || !Identifiant || !Email || !Password || !Role || !PhoneNumber) {
    throw new Error('Tous les champs requis doivent être fournis');
  }
  if (!isValidEspritEmail(Email)) {
    throw new Error("L'email doit être une adresse esprit.tn valide");
  }
  if (!isStrongPassword(Password)) {
    throw new Error('Le mot de passe doit contenir au moins 8 caractères');
  }
  if (!isValidPhone(PhoneNumber)) {
    throw new Error('Numéro de téléphone invalide');
  }
  if (!isValidRole(Role)) {
    throw new Error('Rôle invalide');
  }
  if (!validator.isAlphanumeric(Identifiant)) {
    throw new Error('Identifiant doit être alphanumérique');
  }

  const existingUser = await User.findOne({ $or: [{ Email }, { Identifiant: sanitizeInput(Identifiant) }] });
  if (existingUser) {
    throw new Error('Un utilisateur avec cet email ou identifiant existe déjà');
  }

  const hashedPassword = await bcrypt.hash(Password, 10);
  const newUser = new User({
    Name: sanitizeInput(Name),
    Identifiant: sanitizeInput(Identifiant),
    Email,
    Password: hashedPassword,
    Classe: (Array.isArray(Role) ? Role : [Role]).includes('student') ? sanitizeInput(Classe) : '',
    Role: Array.isArray(Role) ? Role : [Role],
    PhoneNumber: sanitizeInput(PhoneNumber),
    imageUrl: '',
    verified: true,
    enabled: Enabled,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const savedUser = await newUser.save();

  await sendEmail(savedUser.Email, 'Compte créé', `
    <p>Votre compte a été créé avec succès. Cliquez ici pour vous connecter :</p>
    <a href="${loginLink}">Connexion UniMindCare</a>
  `, true);

  res.status(201).json(savedUser);
}));

// GET /
router.get('/', passport.authenticate('jwt', { session: false }), restrictToAdmin, handleAsync(async (req, res) => {
  const users = await User.find({});
  res.status(200).json(users);
}));

// GET /disabled
router.get('/disabled', passport.authenticate('jwt', { session: false }), restrictToAdmin, handleAsync(async (req, res) => {
  const users = await User.find({ enabled: false });
  res.status(200).json(users);
}));

// PUT /enable/:id
router.put('/enable/:id', passport.authenticate('jwt', { session: false }), restrictToAdmin, handleAsync(async (req, res) => {
  if (!validator.isMongoId(req.params.id)) {
    throw new Error('ID invalide');
  }
  const updatedUser = await User.findByIdAndUpdate(req.params.id, { $set: { enabled: true } }, { new: true });
  if (!updatedUser) {
    throw new Error('Utilisateur non trouvé');
  }
  await sendEmail(updatedUser.Email, 'Compte activé', `
    <p>Cliquez ici pour accéder à votre compte :</p>
    <a href="${loginLink}">Connexion UniMindCare</a>
  `, true);
  res.status(200).json(updatedUser);
}));

// PUT /disable/:id
router.put('/disable/:id', passport.authenticate('jwt', { session: false }), restrictToAdmin, handleAsync(async (req, res) => {
  if (!validator.isMongoId(req.params.id)) {
    throw new Error('ID invalide');
  }
  const updatedUser = await User.findByIdAndUpdate(req.params.id, { $set: { enabled: false } }, { new: true });
  if (!updatedUser) {
    throw new Error('Utilisateur non trouvé');
  }
  await sendEmail(updatedUser.Email, 'Compte désactivé', `
    <p>Votre compte a été désactivé par l'administration. Contactez-les pour plus d'informations.</p>
  `, true);
  res.status(200).json(updatedUser);
}));

// PUT /:identifiant/upload-profile-picture
router.put('/:identifiant/upload-profile-picture', validateToken, upload.single('profilePicture'), handleAsync(async (req, res) => {
  const { identifiant } = req.params;
  if (!validator.isAlphanumeric(sanitizeInput(identifiant))) {
    throw new Error('Identifiant invalide');
  }
  if (!req.file) {
    throw new Error('Aucune image fournie');
  }
  const user = await User.findOne({ Identifiant: sanitizeInput(identifiant) });
  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }
  const fileName = `users/${identifiant}/profile/${Date.now()}_${sanitizeInput(req.file.originalname.replace(/[^a-zA-Z0-9.]/g, ''))}`;
  const file = bucket.file(fileName);
  const stream = file.createWriteStream({ metadata: { contentType: req.file.mimetype } });

  stream.on('error', () => {
    throw new Error('Erreur upload image');
  });
  stream.on('finish', async () => {
    await file.makePublic();
    user.imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    user.updatedAt = new Date();
    const updatedUser = await user.save();
    res.status(200).json(updatedUser);
  });
  stream.end(req.file.buffer);
}));

// PUT /:identifiant
router.put('/:identifiant', validateToken, handleAsync(async (req, res) => {
  const { identifiant } = req.params;
  const { currentPassword, newPassword } = req.body;
  if (!validator.isAlphanumeric(sanitizeInput(identifiant))) {
    throw new Error('Identifiant invalide');
  }
  const user = await User.findOne({ Identifiant: sanitizeInput(identifiant) });
  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }
  if (!newPassword || !currentPassword) {
    throw new Error('Mot de passe actuel et nouveau requis');
  }
  const isMatch = await bcrypt.compare(currentPassword, user.Password);
  if (!isMatch) {
    throw new Error('Mot de passe actuel incorrect');
  }
  if (!isStrongPassword(newPassword)) {
    throw new Error('Nouveau mot de passe doit contenir au moins 8 caractères');
  }
  user.Password = await bcrypt.hash(newPassword, 10);
  user.updatedAt = new Date();
  const updated = await user.save();
  res.status(200).json(updated);
}));

// GET /admin
router.get('/admin', passport.authenticate('jwt', { session: false }), restrictToAdmin, handleAsync(async (req, res) => {
  const users = await User.find({}, {
    Name: 1,
    Email: 1,
    Role: 1,
    enabled: 1,
    inappropriateCommentsCount: 1,
    lastInappropriateComment: 1,
  }).sort({ inappropriateCommentsCount: -1 });
  res.status(200).json(users);
}));

// GET /:id/bad-comments
router.get('/:id/bad-comments', passport.authenticate('jwt', { session: false }), restrictToAdmin, handleAsync(async (req, res) => {
  if (!validator.isMongoId(req.params.id)) {
    throw new Error('ID invalide');
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
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.status(200).json(allBadComments);
}));

// PUT /:id/status
router.put('/:id/status', passport.authenticate('jwt', { session: false }), restrictToAdmin, handleAsync(async (req, res) => {
  if (!validator.isMongoId(req.params.id)) {
    throw new Error('ID invalide');
  }
  const { enabled } = req.body;
  if (enabled === undefined) {
    throw new Error('Statut enabled requis');
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }
  const isReactivation = !user.enabled && enabled === true;
  user.enabled = enabled;
  if (enabled === true) {
    user.inappropriateCommentsCount = 0;
    user.lastInappropriateComment = null;
  }
  await user.save();

  if (isReactivation) {
    await sendEmail(user.Email, 'Compte réactivé - AVERTISSEMENT', `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #1976d2;">Compte réactivé</h2>
        <p>Cher(e) ${sanitizeInput(user.Name)},</p>
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
    `, true);
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
}));

module.exports = router;