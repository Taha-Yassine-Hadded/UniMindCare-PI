const mongoose = require("mongoose");

const evaluationSchema = new mongoose.Schema({
  nomEtudiant: { type: String, required: true },
  classe: { type: String, required: true },
  matiere: { type: String, required: true },
  dateEvaluation: { type: Date, required: true },
  engagement: {
    type: String,
    enum: ["Très impliqué", "Moyennement impliqué", "Peu impliqué", "Pas du tout impliqué"],
    required: false, // Optionnel si non présent dans le formulaire
  },
  concentration: { type: Number, min: 1, max: 5, required: false }, // Optionnel
  interaction: {
    type: String,
    enum: ["Positives", "Neutres", "Négatives"],
    required: false,
  },
  reactionCorrection: {
    type: String,
    enum: ["Accepte bien", "Résiste légèrement", "Résiste fortement"],
    required: true,
  },
  gestionStress: {
    type: String,
    enum: ["Calme", "Anxieux", "Très stressé"],
    required: true,
  },
  presence: {
    type: String,
    enum: ["Toujours à l’heure", "Souvent en retard", "Absences fréquentes"],
    required: true,
  },
  expressionEmotionnelle: {
    type: String,
    enum: ["Enthousiaste", "Neutre", "Triste", "Irrité"],
    required: true,
  },
  participationOrale: {
    type: String,
    enum: ["Très active", "Moyenne", "Faible", "Nulle"],
    required: true,
  },
  difficultes: { type: String, required: false },
  pointsPositifs: { type: String, required: false },
  axesAmelioration: { type: String, required: false },
  suiviRecommande: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Champ ajouté
}, { timestamps: true });

module.exports = mongoose.model("Evaluation", evaluationSchema);