const express = require('express');
const router = express.Router();
const { Certificate, UserProgress, TrainingProgram } = require('../../Models/TeacherTraining/TrainingModels');
const { validateToken } = require('../../middleware/authentication');

// Get user certificates
router.get('/my-certificates', validateToken, async (req, res) => {
  try {
    const certificates = await Certificate.find({ 
      userId: req.user.userId 
    }).populate('trainingProgramId');
    res.json(certificates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add certificate
router.post('/:programId', validateToken, async (req, res) => {
  try {
    // Check if user has progress for the program
    const progress = await UserProgress.findOne({
      userId: req.user.userId,
      trainingProgramId: req.params.programId
    });

    const program = await TrainingProgram.findById(req.params.programId);
    if (!program) {
      return res.status(404).json({ message: 'Training program not found' });
    }

    // Check completion based on quiz scores (average >= 70%)
    const isComplete = progress && progress.quizAttempts && progress.quizAttempts.length > 0 
      ? (() => {
          const totalScore = progress.quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
          const averageScore = totalScore / progress.quizAttempts.length;
          return averageScore >= 70;
        })()
      : false;

    if (!isComplete) {
      return res.status(400).json({ 
        message: 'Program not completed yet. Average quiz score must be 70% or higher.' 
      });
    }

    // Check if certificate already exists
    const existingCert = await Certificate.findOne({
      userId: req.user.userId,
      trainingProgramId: req.params.programId
    });
    if (existingCert) {
      return res.status(400).json({ message: 'Certificate already issued' });
    }

    // Generate unique verification code
    const verificationCode = `${req.user.userId}-${req.params.programId}-${Date.now()}`;

    const certificate = new Certificate({
      userId: req.user.userId,
      trainingProgramId: req.params.programId,
      verificationCode,
      issuedAt: new Date()
    });

    await certificate.save();
    await certificate.populate('trainingProgramId');
    res.status(201).json(certificate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;