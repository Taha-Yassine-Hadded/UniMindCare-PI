const express = require('express');
const router = express.Router();
const { TrainingProgram, TrainingContent } = require('../../Models/TeacherTraining/TrainingModels');
const { validateToken, authorizeRoles } = require('../../middleware/authentication');
const multer = require('multer');
const path = require('path');
const validator = require('validator');
const sanitizePath = require('sanitize-filename');

// In-memory rate limiting
const recommendationLimits = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_RECOMMENDATIONS = 5;

// Validation and error handling utilities
const validateProgramInput = (title, description) => {
  if (!validator.isLength(title, { min: 1, max: 100 }) || !validator.isLength(description, { min: 1, max: 1000 })) {
    throw new Error('Titre (1-100 caractères) et description (1-1000 caractères) requis');
  }
};

const validateMongoId = (id) => {
  if (!validator.isMongoId(id)) {
    throw new Error('ID programme invalide');
  }
};

const handleAsync = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error(`Erreur: ${error.message}`, error);
    res.status(
      error.message.includes('requis') || error.message.includes('invalide') ? 400 :
      error.message.includes('non trouvé') || error.message.includes('not found') ? 404 :
      error.message.includes('Limite') ? 429 : 500
    ).json({ message: error.message });
  }
};

const checkRateLimit = (userId) => {
  const now = Date.now();
  const userLimit = recommendationLimits.get(userId) || { count: 0, reset: now };
  if (userLimit.reset < now - RATE_LIMIT_WINDOW) {
    userLimit.count = 0;
    userLimit.reset = now;
  }
  if (userLimit.count >= MAX_RECOMMENDATIONS) {
    throw new Error('Limite de recommandations atteinte. Réessayez plus tard.');
  }
  userLimit.count += 1;
  recommendationLimits.set(userId, userLimit);
};

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/program-images')),
  filename: (req, file, cb) => {
    const sanitizedName = sanitizePath(file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'));
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random * 1E9);
    cb(null, `program-${uniqueSuffix}${path.extname(sanitizedName).toLowerCase()}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Seules les images JPEG, PNG ou GIF sont autorisées'), false);
  }
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

const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

// Routes
router.post('/', validateToken, authorizeRoles(['psychologist']), upload.single('programImage'), handleAsync(async (req, res) => {
  const { title, description } = req.body;
  validateProgramInput(title, description);

  const imgUrl = req.file ? path.posix.join('/uploads/program-images', sanitizePath(req.file.filename)) : null;
  const program = new TrainingProgram({ title, description, psychologistId: req.user.userId, imgUrl });
  await program.save();
  res.status(201).json(program);
}));

router.get('/my-programs', validateToken, handleAsync(async (req, res) => {
  const programs = await TrainingProgram.find({ psychologistId: req.user.userId });
  const programsWithContents = await Promise.all(
    programs.map(async (program) => ({
      ...program.toObject(),
      contents: await TrainingContent.find({ trainingProgramId: program._id }),
    }))
  );
  res.json(programsWithContents);
}));

router.get('/all-programs', validateToken, handleAsync(async (req, res) => {
  const programs = await TrainingProgram.find();
  res.json(programs);
}));

router.get('/:id', validateToken, handleAsync(async (req, res) => {
  validateMongoId(req.params.id);
  const program = await TrainingProgram.findById(req.params.id);
  if (!program) {
    throw new Error('Program not found');
  }
  res.json(program);
}));

router.put('/:id', validateToken, authorizeRoles(['psychologist']), upload.single('programImage'), handleAsync(async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  validateMongoId(id);
  validateProgramInput(title, description);

  const existingProgram = await TrainingProgram.findOne({ _id: id, psychologistId: req.user.userId });
  if (!existingProgram) {
    throw new Error('Programme non trouvé ou non autorisé');
  }

  const updateData = { title, description };
  if (req.file) {
    updateData.imgUrl = path.posix.join('/uploads/program-images', sanitizePath(req.file.filename));
  }
  const updatedProgram = await TrainingProgram.findByIdAndUpdate(id, updateData, { new: true });
  res.json(updatedProgram);
}));

router.delete('/:id', validateToken, authorizeRoles(['psychologist']), handleAsync(async (req, res) => {
  validateMongoId(req.params.id);
  const program = await TrainingProgram.findOne({ _id: req.params.id, psychologistId: req.user.userId });
  if (!program) {
    throw new Error('Programme non trouvé ou non autorisé');
  }
  await program.deleteOne();
  res.json({ message: 'Programme supprimé avec succès' });
}));

router.post('/:id/recommend', validateToken, handleAsync(async (req, res) => {
  validateMongoId(req.params.id);
  checkRateLimit(req.user.userId);

  const program = await TrainingProgram.findById(req.params.id);
  if (!program) {
    throw new Error('Programme non trouvé');
  }
  if (program.recommendedBy.includes(req.user.userId)) {
    throw new Error('Vous avez déjà recommandé ce programme');
  }
  program.recommendedBy.push(req.user.userId);
  await program.save();
  res.json({ message: 'Programme recommandé avec succès', program });
}));

router.post('/:id/unrecommend', validateToken, handleAsync(async (req, res) => {
  validateMongoId(req.params.id);
  checkRateLimit(req.user.userId);

  const program = await TrainingProgram.findById(req.params.id);
  if (!program) {
    throw new Error('Programme non trouvé');
  }
  if (!program.recommendedBy.includes(req.user.userId)) {
    throw new Error('Vous n\'avez pas recommandé ce programme');
  }
  program.recommendedBy = program.recommendedBy.filter(id => id.toString() !== req.user.userId);
  await program.save();
  res.json({ message: 'Recommandation retirée avec succès', program });
}));

module.exports = router;