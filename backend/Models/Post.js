// Models/Post.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isAnonymous: { type: Boolean, default: false },
  anonymousPseudo: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Référence à l'utilisateur
  isAnonymous: { type: Boolean, default: false }, // Nouveau champ pour l'anonymat
  anonymousPseudo: { type: String }, // Pseudo généré si anonyme
  createdAt: { type: Date, default: Date.now },
  comments: [commentSchema] // Ajout du tableau de commentaires
});

module.exports = mongoose.model('Post', postSchema);