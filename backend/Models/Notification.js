// Models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Utilisateur qui reçoit la notification
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Utilisateur qui a effectué l'action
  type: { type: String, enum: ['like_post', 'like_comment', 'dislike_comment', 'comment'], required: true }, // Type de notification
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true }, // Publication concernée
  comment: { type: mongoose.Schema.Types.ObjectId }, // ID du commentaire (subdocument dans Post.comments, pas une référence)
  isAnonymous: { type: Boolean, default: false }, // Si l'action est anonyme
  anonymousPseudo: { type: String }, // Pseudo anonyme (si applicable)
  read: { type: Boolean, default: false }, // Si la notification a été lue
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);