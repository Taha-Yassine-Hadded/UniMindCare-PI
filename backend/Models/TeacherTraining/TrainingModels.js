const mongoose = require('mongoose');

// 1. Training Program
const trainingProgramSchema = new mongoose.Schema({
  title: String,
  description: String,
  psychologistId: mongoose.Schema.Types.ObjectId,
  passingScore: Number
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
  order: Number,
  trainingProgramId: mongoose.Schema.Types.ObjectId
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