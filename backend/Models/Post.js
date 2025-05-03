// Models/Post.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isAnonymous: { type: Boolean, default: false },
  anonymousPseudo: { type: String },
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of user IDs who liked
  dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isInappropriate: { type: Boolean, default: false }, // Flag for inappropriate content
  flagReason: { type: String }, // Reason why the comment was flagged
  flaggedAt: { type: Date } // When the comment was flagged // Array of user IDs who disliked
});

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Référence à l'utilisateur
  isAnonymous: { type: Boolean, default: false }, // Nouveau champ pour l'anonymat
  anonymousPseudo: { type: String }, // Pseudo généré si anonyme
  imageUrl: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
  comments: [commentSchema],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Ajout du tableau de commentaires
  views: { type: Number, default: 0 }, // Nouveau champ pour les vues
  tags: [{ type: String }], // Champ pour les tags/catégories (si pertinent pour les sujets)
  // Add stress detection fields
  isDistress: { type: Boolean, default: false },
  distressScore: { type: Number, default: 0 },
  distressAlerted: { type: Boolean, default: false },
  distressAlertedAt: { type: Date }
});

module.exports = mongoose.model('Post', postSchema);