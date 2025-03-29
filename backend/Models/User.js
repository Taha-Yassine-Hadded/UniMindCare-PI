const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  Name: String,
  Identifiant: { type: String, unique: true },
  Email: { type: String, unique: true, required: true },
  Password: String,
  Classe: String,
  Role: String,
  PhoneNumber: String,  // éviter les espaces dans le nom de champ
  imageUrl: String,
  enabled: { type: Boolean, default: false },
  verified: { type: Boolean, default: false }  // champ ajouté pour la vérification de l'email
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
