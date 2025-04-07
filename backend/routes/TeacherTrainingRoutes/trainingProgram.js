const express = require('express');
const router = express.Router();
const { TrainingProgram } = require('../../Models/TeacherTraining/TrainingModels');
const { validateToken, authorizeRoles } = require('../../middleware/authentication');

// Create new program
router.post('/', validateToken, authorizeRoles('psychologist'), async (req, res) => {
  try {
    const program = new TrainingProgram({
      ...req.body,
      psychologistId: req.user.userId
    });
    await program.save();
    res.status(201).json(program);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get psychologist's programs
router.get('/my-programs', validateToken, authorizeRoles('psychologist'), async (req, res) => {
  try {
    const programs = await TrainingProgram.find({ psychologistId: req.user.userId });
    res.json(programs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get program details
router.get('/:id', validateToken, async (req, res) => {
  try {
    const program = await TrainingProgram.findById(req.params.id);
    if (!program) return res.status(404).json({ message: 'Program not found' });
    res.json(program);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update program
router.patch('/:id', validateToken, authorizeRoles('psychologist'), async (req, res) => {
  try {
    const program = await TrainingProgram.findOne({
      _id: req.params.id,
      psychologistId: req.user.userId
    });
    
    if (!program) {
      return res.status(404).json({ 
        message: 'Program not found or you don\'t have permission to update it' 
      });
    }

    // Update only provided fields
    Object.assign(program, req.body);
    await program.save();
    res.json(program);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete program
router.delete('/:id', validateToken, authorizeRoles('psychologist'), async (req, res) => {
  try {
    const program = await TrainingProgram.findOne({
      _id: req.params.id,
      psychologistId: req.user.userId
    });
    
    if (!program) {
      return res.status(404).json({ 
        message: 'Program not found or you don\'t have permission to delete it' 
      });
    }

    await program.deleteOne();
    res.json({ message: 'Program deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;