const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'text' },
  fileName: { type: String },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }, // Champ read avec valeur par défaut false
});

module.exports = mongoose.model('Message', messageSchema);