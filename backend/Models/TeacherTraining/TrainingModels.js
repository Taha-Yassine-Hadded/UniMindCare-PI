const mongoose = require('mongoose');

// 1. Training Program
const trainingProgramSchema = new mongoose.Schema({
  title: String,
  description: String,
  psychologistId: mongoose.Schema.Types.ObjectId,
  recommendedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming you have a User model
    default: [] // Default to an empty array
  }],
  creationDate: {
    type: Date,
    default: Date.now // Automatically set to the current date/time when created
  },
  imgUrl: String
});

// 2. Training Content (videos, PDFs, quizzes, etc.)
const trainingContentSchema = new mongoose.Schema({
  title: String,
  type: String,
  contentUrl: String,
  meetingLink: String,
  scheduledDate: Date,
  questions: [{
    text: String,
    options: [String],
    correctAnswer: String
  }],
  trainingProgramId: mongoose.Schema.Types.ObjectId,
  createdAt: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    default: ''
  },
  results: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    result: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    }
  }]
});

// 3. User Progress
const userProgressSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  trainingProgramId: mongoose.Schema.Types.ObjectId,
  completedContents: [{
    contentId: mongoose.Schema.Types.ObjectId,
    completedAt: Date
  }],
  quizAttempts: [{
    contentId: mongoose.Schema.Types.ObjectId,
    score: Number,
    responses: [{
      questionText: String,
      selectedAnswer: String,
      correctAnswer: String,
      isCorrect: Boolean
    }],
    attemptedAt: Date
  }],
});

// 4. Certificate
const certificateSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  trainingProgramId: mongoose.Schema.Types.ObjectId,
  issuedAt: Date,
  certificateUrl: String,
  verificationCode: String,
  averageScore: Number
});

// Create models
const TrainingProgram = mongoose.model('TrainingProgram', trainingProgramSchema);
const TrainingContent = mongoose.model('TrainingContent', trainingContentSchema);
const UserProgress = mongoose.model('UserProgress', userProgressSchema);
const Certificate = mongoose.model('Certificate', certificateSchema);

module.exports = {
  TrainingProgram,
  TrainingContent,
  UserProgress,
  Certificate
};