const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  Name: String,
  Identifiant: { type: String, unique: true },
  Email: { type: String, unique: true, required: true },
  Password: String,
  Classe: String,
  Role: String,
  PhoneNumber: String,
  imageUrl: String,
  enabled: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  enableExitRequestSorting: { type: Boolean, default: false },
}, { timestamps: true });

// Exporter le modèle existant s'il est déjà compilé sinon le compiler
module.exports = mongoose.models.User || mongoose.model('User', userSchema);