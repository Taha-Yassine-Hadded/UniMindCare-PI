// Models/message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true }, // Identifiant (ex: "233AFT08946")
  receiver: { type: String, required: true }, // Identifiant (ex: "233AFT08947")
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);