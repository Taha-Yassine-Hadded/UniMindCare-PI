const express = require('express');
const router = express.Router();
const { TrainingProgram, TrainingContent } = require('../../Models/TeacherTraining/TrainingModels');
const { validateToken, authorizeRoles } = require('../../middleware/authentication');
const multer = require('multer');
const path = require('path');
const validator = require('validator');
const sanitizePath = require('sanitize-filename');
const { createHash } = require('crypto');

// In-memory rate limiting (for demo; use express-rate-limit in production)
const recommendationLimits = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_RECOMMENDATIONS = 5;

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/program-images');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const sanitizedName = sanitizePath(file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'));
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(sanitizedName).toLowerCase();
    cb(null, `program-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Seules les images JPEG, PNG ou GIF sont autorisées'), false);
  }
  // Basic content validation (check magic bytes)
  const buffer = file.buffer || Buffer.alloc(0);
  const isValidImage =
    (file.mimetype === 'image/jpeg' && buffer.slice(0, 3).toString('hex') === 'ffd8ff') ||
    (file.mimetype === 'image/png' && buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a') ||
    (file.mimetype === 'image/gif' && buffer.slice(0, 6).toString('hex').startsWith('47494638'));
  if (!isValidImage) {
    return cb(new Error('Fichier image invalide ou corrompu'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// POST / - Create new program (psychologist only)
router.post('/', validateToken, authorizeRoles(['psychologist']), upload.single('programImage'), async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!validator.isLength(title, { min: 1, max: 100 }) || !validator.isLength(description, { min: 1, max: 1000 })) {
      return res.status(400).json({ message: 'Titre (1-100 caractères) et description (1-1000 caractères) requis' });
    }

    const imgUrl = req.file
      ? path.posix.join('/uploads/program-images', sanitizePath(req.file.filename))
      : null;

    const program = new TrainingProgram({
      title,
      description,
      psychologistId: req.user.userId,
      imgUrl,
    });

    await program.save();
    res.status(201).json(program);
  } catch (error) {
    console.error('Erreur création programme:', error);
    res.status(400).json({ message: error.message });
  }
});

// GET /my-programs - Get user's programs
router.get('/my-programs', validateToken, async (req, res) => {
  try {
    const programs = await TrainingProgram.find({ psychologistId: req.user.userId });
    const programsWithContents = await Promise.all(
      programs.map(async (program) => {
        const contents = await TrainingContent.find({ trainingProgramId: program._id });
        return { ...program.toObject(), contents };
      })
    );
    res.json(programsWithContents);
  } catch (error) {
    console.error('Erreur récupération programmes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /all-programs - Get all programs
router.get('/all-programs', validateToken, async (req, res) => {
  try {
    const programs = await TrainingProgram.find();
    res.json(programs);
  } catch (error) {
    console.error('Erreur récupération tous programmes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /:id - Get program details
router.get('/:id', validateToken, async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      return res.status(400).json({ message: 'ID programme invalide' });
    }
    const program = await TrainingProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }
    res.json(program);
  } catch (error) {
    console.error('Erreur récupération programme:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// PUT /:id - Update program (psychologist only)
router.put('/:id', validateToken, authorizeRoles(['psychologist']), upload.single('programImage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    if (!validator.isMongoId(id)) {
      return res.status(400).json({ message: 'ID programme invalide' });
    }
    if (!validator.isLength(title, { min: 1, max: 100 }) || !validator.isLength(description, { min: 1, max: 1000 })) {
      return res.status(400).json({ message: 'Titre (1-100 caractères) et description (1-1000 caractères) requis' });
    }

    const existingProgram = await TrainingProgram.findOne({ _id: id, psychologistId: req.user.userId });
    if (!existingProgram) {
      return res.status(404).json({ message: 'Programme non trouvé ou non autorisé' });
    }

    const updateData = { title, description };
    if (req.file) {
      updateData.imgUrl = path.posix.join('/Uploads/program-images', sanitizePath(req.file.filename));
    }

    const updatedProgram = await TrainingProgram.findByIdAndUpdate(id, updateData, { new: true });
    res.json(updatedProgram);
  } catch (error) {
    console.error('Erreur mise à jour programme:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// DELETE /:id - Delete program (psychologist only)
router.delete('/:id', validateToken, authorizeRoles(['psychologist']), async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      return res.status(400).json({ message: 'ID programme invalide' });
    }
    const program = await TrainingProgram.findOne({
      _id: req.params.id,
      psychologistId: req.user.userId,
    });
    if (!program) {
      return res.status(404).json({ message: 'Programme non trouvé ou non autorisé' });
    }

    await program.deleteOne();
    res.json({ message: 'Programme supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression programme:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /:id/recommend - Recommend a program
router.post('/:id/recommend', validateToken, async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      return res.status(400).json({ message: 'ID programme invalide' });
    }

    // Rate limiting
    const userId = req.user.userId;
    const now = Date.now();
    const userLimit = recommendationLimits.get(userId) || { count: 0, reset: now };
    if (userLimit.reset < now - RATE_LIMIT_WINDOW) {
      userLimit.count = 0;
      userLimit.reset = now;
    }
    if (userLimit.count >= MAX_RECOMMENDATIONS) {
      return res.status(429).json({ message: 'Limite de recommandations atteinte. Réessayez plus tard.' });
    }
    userLimit.count += 1;
    recommendationLimits.set(userId, userLimit);

    const program = await TrainingProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: 'Programme non trouvé' });
    }
    if (program.recommendedBy.includes(userId)) {
      return res.status(400).json({ message: 'Vous avez déjà recommandé ce programme' });
    }

    program.recommendedBy.push(userId);
    await program.save();
    res.json({ message: 'Programme recommandé avec succès', program });
  } catch (error) {
    console.error('Erreur recommandation programme:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /:id/unrecommend - Unrecommend a program
router.post('/:id/unrecommend', validateToken, async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      return res.status(400).json({ message: 'ID programme invalide' });
    }

    // Rate limiting
    const userId = req.user.userId;
    const now = Date.now();
    const userLimit = recommendationLimits.get(userId) || { count: 0, reset: now };
    if (userLimit.reset < now - RATE_LIMIT_WINDOW) {
      userLimit.count = 0;
      userLimit.reset = now;
    }
    if (userLimit.count >= MAX_RECOMMENDATIONS) {
      return res.status(429).json({ message: 'Limite de recommandations atteinte. Réessayez plus tard.' });
    }
    userLimit.count += 1;
    recommendationLimits.set(userId, userLimit);

    const program = await TrainingProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: 'Programme non trouvé' });
    }
    if (!program.recommendedBy.includes(userId)) {
      return res.status(400).json({ message: 'Vous n\'avez pas recommandé ce programme' });
    }

    program.recommendedBy = program.recommendedBy.filter(id => id.toString() !== userId);
    await program.save();
    res.json({ message: 'Recommandation retirée avec succès', program });
  } catch (error) {
    console.error('Erreur retrait recommandation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;