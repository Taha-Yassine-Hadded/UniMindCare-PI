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
// Nouvelle route pour les statistiques par étudiant
app.get("/api/statistiques/:nomEtudiant", async (req, res) => {
  try {
    const nomEtudiant = req.params.nomEtudiant;
    const evaluations = await Evaluation.find({ nomEtudiant });

    if (!evaluations.length) {
      return res.status(404).json({ message: "Aucune évaluation trouvée pour cet étudiant" });
    }

    // Calcul des statistiques
    const stats = {
      totalEvaluations: evaluations.length,
      moyenneConcentration: evaluations.reduce((sum, eval) => sum + eval.concentration, 0) / evaluations.length,
      engagement: {},
      interaction: {},
      reactionCorrection: {},
      gestionStress: {},
      presence: {},
      suiviRecommande: evaluations.filter(e => e.suiviRecommande).length / evaluations.length * 100,
    };

    // Répartition des valeurs pour chaque champ catégorique
    const countOccurrences = (field) => {
      const counts = {};
      evaluations.forEach(e => {
        counts[e[field]] = (counts[e[field]] || 0) + 1;
      });
      for (const key in counts) {
        counts[key] = (counts[key] / evaluations.length * 100).toFixed(2) + "%";
      }
      return counts;
    };

    stats.engagement = countOccurrences("engagement");
    stats.interaction = countOccurrences("interaction");
    stats.reactionCorrection = countOccurrences("reactionCorrection");
    stats.gestionStress = countOccurrences("gestionStress");
    stats.presence = countOccurrences("presence");

    res.status(200).json(stats);
  } catch (error) {
    console.error("Erreur lors du calcul des statistiques :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Erreur serveur" });
});

module.exports = app;