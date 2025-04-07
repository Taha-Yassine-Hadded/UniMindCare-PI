const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  nomEnseignant: { type: String, required: true },
  matiere: { type: String, required: true },
  dateSession: { type: Date, required: true },
  clarteExplications: { type: String, required: true },
  interactionEtudiant: { type: String, required: true },
  disponibilite: { type: String, required: true },
  gestionCours: { type: String, required: true },
  satisfactionGlobale: { type: Number, required: true, min: 1, max: 5 },
  commentaire: { type: String },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Feedback", feedbackSchema);