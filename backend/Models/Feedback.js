const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  etudiantId: { type: String, required: true }, // Identifiant de l'étudiant
  enseignantId: { type: String, required: true }, // Identifiant de l'enseignant
  avis: { 
    type: String, 
    required: true, 
    enum: ['Excellent', 'Bon', 'Moyen', 'Mauvais'], // Options prédéfinies
  },
  remarque: { type: String, trim: true }, // Remarque facultative
  date: { type: Date, default: Date.now }, // Date de soumission
});

module.exports = mongoose.model('Feedback', feedbackSchema);