const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const logger = require("morgan");

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());
app.use(logger("dev"));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connecté"))
  .catch(err => console.error("Erreur de connexion à MongoDB", err));

const evaluationSchema = new mongoose.Schema({
  nomEtudiant: { type: String, required: true },
  classe: { type: String, required: true },
  matiere: { type: String, required: true },
  dateEvaluation: { type: Date, required: true },
  engagement: { type: String, required: true },
  concentration: { type: Number, required: true },
  interaction: { type: String, required: true },
  reactionCorrection: { type: String, required: true },
  gestionStress: { type: String, required: true },
  presence: { type: String, required: true },
  expressionEmotionnelle: String,
  participationOrale: String,
  difficultes: String,
  pointsPositifs: String,
  axesAmelioration: String,
  suiviRecommande: { type: Boolean, default: false },
});

const Evaluation = mongoose.model("Evaluation", evaluationSchema);

app.post("/api/evaluation", async (req, res) => {
  console.log("Requête reçue :", req.body);
  try {
    const evaluation = new Evaluation(req.body);
    await evaluation.save();
    console.log("Évaluation enregistrée :", evaluation);
    res.status(201).json({ message: "Évaluation ajoutée avec succès", data: evaluation });
  } catch (error) {
    console.error("Erreur :", error);
    res.status(500).json({ message: "Erreur lors de la création", error: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Erreur serveur" });
});

module.exports = app;