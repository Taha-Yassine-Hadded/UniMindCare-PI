// Models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Référence à l'utilisateur
  isAnonymous: { type: Boolean, default: false }, // Nouveau champ pour l'anonymat
  anonymousPseudo: { type: String }, // Pseudo généré si anonyme
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);