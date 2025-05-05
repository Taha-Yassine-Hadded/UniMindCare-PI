const express = require('express');
const router = express.Router();
const { TrainingProgram } = require('../../Models/TeacherTraining/TrainingModels');
const { TrainingContent } = require('../../Models/TeacherTraining/TrainingModels');
const { validateToken, authorizeRoles } = require('../../middleware/authentication');


const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/program-images'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'program-' + uniqueSuffix + ext);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  }
});

// Create new program
router.post('/', validateToken, upload.single('programImage'), async (req, res) => {
  try {
    const program = new TrainingProgram({
      ...req.body,
      psychologistId: req.user.userId
    });

     // Add image URL if file was uploaded
     if (req.file) {
      // Store the path relative to your server or as a URL
      program.imgUrl = `/uploads/program-images/${req.file.filename}`;
    }

    await program.save();
    res.status(201).json(program);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/my-programs', validateToken, async (req, res) => {
  try {
    const programs = await TrainingProgram.find({ psychologistId: req.user.userId });

    // Fetch contents for each program
    const programsWithContents = await Promise.all(
      programs.map(async (program) => {
        const contents = await TrainingContent.find({ trainingProgramId: program._id });
        return { ...program.toObject(), contents }; // Add contents to the program object
      })
    );

    res.json(programsWithContents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all programs
router.get('/all-programs', validateToken, async (req, res) => {
  try {
    const programs = await TrainingProgram.find();
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

// Backend route for updating a program
router.put('/:id', upload.single('programImage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    
    // Get the existing program to check if user is authorized
    const existingProgram = await TrainingProgram.findById(id);
    
    // Check if program exists
    if (!existingProgram) {
      return res.status(404).json({ message: 'Program not found' });
    }
    
    // Prepare update data
    const updateData = {
      title,
      description
    };
    
    // Add image URL if new file was uploaded
    if (req.file) {
      updateData.imgUrl = `/uploads/program-images/${req.file.filename}`;
    }
    
    // Update the program
    const updatedProgram = await TrainingProgram.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    res.json(updatedProgram);
  } catch (error) {
    console.error('Error updating training program:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete program
router.delete('/:id', validateToken, async (req, res) => {
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

// Recommend a program (add user ID to recommendedBy)
router.post('/:id/recommend', validateToken, async (req, res) => {
  try {
    const program = await TrainingProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    const userId = req.user.userId;
    // Check if the user has already recommended the program
    if (program.recommendedBy.includes(userId)) {
      return res.status(400).json({ message: 'You have already recommended this program' });
    }

    // Add the user ID to the recommendedBy list
    program.recommendedBy.push(userId);
    await program.save();

    res.json({ message: 'Program recommended successfully', program });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Unrecommend a program (remove user ID from recommendedBy)
router.post('/:id/unrecommend', validateToken, async (req, res) => {
  try {
    const program = await TrainingProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    const userId = req.user.userId;
    // Check if the user has recommended the program
    if (!program.recommendedBy.includes(userId)) {
      return res.status(400).json({ message: 'You have not recommended this program' });
    }

    // Remove the user ID from the recommendedBy list
    program.recommendedBy = program.recommendedBy.filter(id => id.toString() !== userId.toString());
    await program.save();

    res.json({ message: 'Recommendation removed successfully', program });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;