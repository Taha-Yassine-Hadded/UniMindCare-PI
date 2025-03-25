const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: [{
    questionId: Number,
    answer: Number // 1-5 pour l'échelle de Likert
  }],
  score: Number,
  emotionalState: String,
  recommendations: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Response = mongoose.model('Response', responseSchema);
module.exports = { Response };