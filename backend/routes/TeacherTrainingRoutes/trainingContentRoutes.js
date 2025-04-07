const express = require('express');
const router = express.Router();
const { TrainingContent, TrainingProgram } = require('../../Models/TeacherTraining/TrainingModels');
const { validateToken, authorizeRoles } = require('../../middleware/authentication');

// Add content to program
router.post('/:trainingProgramId', validateToken, authorizeRoles('psychologist'), async (req, res) => {
  try {
    // Verify psychologist owns the program
    const program = await TrainingProgram.findOne({
      _id: req.params.trainingProgramId,
      psychologistId: req.user.userId
    });
    if (!program) return res.status(403).json({ message: 'Not your program' });

    const contentData = {
      ...req.body,
      trainingProgramId: req.params.trainingProgramId
    };
    
    const content = new TrainingContent(contentData);
    await content.save();
    res.status(201).json(content);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get program contents
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

// Update content
router.patch('/:contentId', validateToken, authorizeRoles('psychologist'), async (req, res) => {
  try {
    // Find the content and verify ownership through program
    const content = await TrainingContent.findById(req.params.contentId);
    if (!content) return res.status(404).json({ message: 'Content not found' });

    const program = await TrainingProgram.findOne({
      _id: content.trainingProgramId,
      psychologistId: req.user.userId
    });
    if (!program) return res.status(403).json({ message: 'Not your content' });

    // Update only provided fields
    Object.assign(content, req.body);
    await content.save();
    res.json(content);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete content
router.delete('/:contentId', validateToken, authorizeRoles('psychologist'), async (req, res) => {
  try {
    // Find the content and verify ownership through program
    const content = await TrainingContent.findById(req.params.contentId);
    if (!content) return res.status(404).json({ message: 'Content not found' });

    const program = await TrainingProgram.findOne({
      _id: content.trainingProgramId,
      psychologistId: req.user.userId
    });
    if (!program) return res.status(403).json({ message: 'Not your content' });

    await content.deleteOne();
    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;