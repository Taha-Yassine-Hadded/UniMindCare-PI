const mongoose = require('mongoose');

const resultatStudentEmotionSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  gesture: {
    type: String,
  },
  speech_text: {
    type: String
  },
  keywords: {
    type: [String]
  }
});

module.exports = mongoose.model('ResultatsStudentsEmotions', resultatStudentEmotionSchema);