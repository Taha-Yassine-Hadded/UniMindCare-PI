const express = require('express');
const router = express.Router();
const { TrainingContent, TrainingProgram } = require('../../Models/TeacherTraining/TrainingModels');
const { validateToken, authorizeRoles } = require('../../middleware/authentication');
const multer = require('multer');
const { bucket } = require('../../firebase');
const { v4: uuidv4 } = require('uuid');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file && file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Add content to program
router.post(
  '/:trainingProgramId',
  validateToken,
  upload.single('file'),
  async (req, res) => {
    try {
      const program = await TrainingProgram.findOne({
        _id: req.params.trainingProgramId,
        psychologistId: req.user.userId
      });
      if (!program) return res.status(403).json({ message: 'Not your program' });

      const contentData = {
        title: req.body.title,
        type: req.body.type,
        trainingProgramId: req.params.trainingProgramId
      };

      // Add description field if provided
      if (req.body.description) {
        contentData.description = req.body.description;
      }

      switch (req.body.type) {
        case 'video':
          contentData.contentUrl = req.body.contentUrl;
          if (!contentData.contentUrl) {
            return res.status(400).json({ message: 'Content URL is required for video' });
          }
          break;
        case 'article':
          contentData.contentUrl = req.body.contentUrl;
          if (!contentData.contentUrl) {
            return res.status(400).json({ message: 'Content URL is required for article' });
          }
          break;
        case 'meet':
          contentData.meetingLink = req.body.meetingLink;
          contentData.scheduledDate = req.body.scheduledDate ? new Date(req.body.scheduledDate) : null;
          if (!contentData.meetingLink || !contentData.scheduledDate) {
            return res.status(400).json({ message: 'Meeting link and scheduled date are required for meet' });
          }
          break;
        case 'pdf':
          if (req.file) {
            const fileName = `${uuidv4()}-${req.file.originalname}`;
            const file = bucket.file(`content/${fileName}`);

            await file.save(req.file.buffer, {
              metadata: {
                contentType: req.file.mimetype,
                metadata: {
                  originalFileName: req.file.originalname // Store original file name in metadata
                }
              }
            });

            // Generate a signed URL with the original file name for download
            const [downloadUrl] = await file.getSignedUrl({
              action: 'read',
              expires: '03-09-2491', // Long expiration date
              responseDisposition: `attachment; filename="${req.file.originalname}"`
            });

            contentData.contentUrl = downloadUrl;
          } else {
            return res.status(400).json({ message: 'PDF file is required for type "pdf"' });
          }
          break;
        case 'quiz':
          contentData.questions = req.body.questions ? JSON.parse(req.body.questions) : [];
          if (!contentData.questions.length) {
            return res.status(400).json({ message: 'At least one question is required for quiz' });
          }
          break;
        default:
          return res.status(400).json({ message: `Invalid content type: ${req.body.type}` });
      }

      const content = new TrainingContent(contentData);
      await content.save();
      res.status(201).json(content);
    } catch (error) {
      console.error('Error creating content:', error);
      res.status(400).json({ message: error.message });
    }
  }
);


// Submit quiz result
router.post('/:contentId/submit-quiz-result', validateToken, async (req, res) => {
  try {
    const { contentId } = req.params; // Get contentId (quiz ID) from URL params
    const userId = req.user.userId; // Get userId from middleware
    const { result } = req.body; // Get result from request body

    // Validate input
    if (result === undefined) {
      return res.status(400).json({ message: 'Result is required.' });
    }

    if (typeof result !== 'number' || result < 0 || result > 100) {
      return res.status(400).json({ message: 'Result must be a number between 0 and 100.' });
    }

    // Find the content (quiz) by ID
    const content = await TrainingContent.findById(contentId);
    if (!content) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    // Ensure the content is a quiz
    if (content.type !== 'quiz') {
      return res.status(400).json({ message: 'Content is not a quiz.' });
    }

    // Check if the user has already submitted a result for this quiz
    const existingResult = content.results.find(r => r.userId.toString() === userId);
    if (existingResult) {
      return res.status(400).json({ message: 'User has already submitted a result for this quiz.' });
    }

    // Add the new result to the results array
    content.results.push({ userId, result });

    // Save the updated content
    await content.save();

    res.status(200).json({ message: 'Quiz result submitted successfully.', result });
  } catch (error) {
    console.error('Error submitting quiz result:', error);
    res.status(500).json({ message: 'Server error while submitting quiz result.' });
  }
});



// Delete content (unchanged, already handles Firebase Storage deletion)
router.delete('/:contentId', validateToken, async (req, res) => {
  try {
    const content = await TrainingContent.findById(req.params.contentId);
    if (!content) return res.status(404).json({ message: 'Content not found' });

    const program = await TrainingProgram.findOne({
      _id: content.trainingProgramId,
      psychologistId: req.user.userId
    });
    if (!program) return res.status(403).json({ message: 'Not your content' });

    if (content.type === 'pdf' && content.contentUrl) {
      const filePath = content.contentUrl.split('/content/')[1]?.split('?')[0];
      if (filePath) {
        const file = bucket.file(`content/${filePath}`);
        await file.delete().catch(err => console.error('Error deleting file from Firebase Storage:', err));
      }
    }

    await content.deleteOne();
    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get program contents (unchanged)
router.get('/program/:programId', validateToken, async (req, res) => {
  try {
    const contents = await TrainingContent.find({
      trainingProgramId: req.params.programId
    }).sort('order');
    res.json(contents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;