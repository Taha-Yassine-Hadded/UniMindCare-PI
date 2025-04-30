const mongoose = require('mongoose');

const inappropriateCommentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  postTitle: { type: String },
  createdAt: { type: Date, default: Date.now },
  reason: { type: String, default: 'Contenu inapproprié détecté' }
});

module.exports = mongoose.model('InappropriateComment', inappropriateCommentSchema);