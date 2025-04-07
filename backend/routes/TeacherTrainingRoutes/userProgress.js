const express = require('express');
const router = express.Router();
const { UserProgress, TrainingContent, TrainingProgram } = require('../../Models/TeacherTraining/TrainingModels');
const { validateToken, authorizeRoles } = require('../../middleware/authentication');

// Mark content as complete
router.post('/content/:contentId/complete', validateToken, async (req, res) => {
  try {
    const content = await TrainingContent.findById(req.params.contentId);
    if (!content) return res.status(404).json({ message: 'Content not found' });

    await UserProgress.updateOne(
      { 
        userId: req.user.userId, 
        trainingProgramId: content.trainingProgramId 
      },
      { 
        $addToSet: { 
          completedContents: { 
            contentId: req.params.contentId, 
            completedAt: new Date() 
          } 
        },
        $set: { lastAccessed: new Date() }
      },
      { upsert: true }
    );

    res.json({ message: 'Content marked as complete' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit quiz answers
router.post('/content/:contentId/submit-quiz', validateToken, async (req, res) => {
  try {
    const { responses } = req.body;
    const quiz = await TrainingContent.findById(req.params.contentId);
    if (!quiz || quiz.type !== 'quiz') {
      return res.status(400).json({ message: 'Invalid quiz' });
    }

    // Calculate score
    const correct = quiz.questions.filter((q, i) => 
      q.correctAnswer === responses[i].selectedAnswer
    ).length;
    const score = Math.round((correct / quiz.questions.length) * 100);

    await UserProgress.updateOne(
      { 
        userId: req.user.userId, 
        trainingProgramId: quiz.trainingProgramId 
      },
      {
        $push: { 
          quizAttempts: {
            contentId: req.params.contentId,
            score,
            responses,
            attemptedAt: new Date()
          }
        },
        $set: { lastAccessed: new Date() }
      },
      { upsert: true }
    );

    res.json({ score, message: 'Quiz submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user progress (unchanged)
router.get('/:programId', validateToken, async (req, res) => {
  try {
    const progress = await UserProgress.findOne({
      userId: req.user.userId,
      trainingProgramId: req.params.programId
    }).populate('completedContents.contentId');

    res.json(progress || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;