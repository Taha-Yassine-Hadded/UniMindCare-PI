const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const Evaluation = require("./routes/evalution");
const cors = require("cors");
const logger = require("morgan");

dotenv.config();
connectDB();

const app = express();
const router = express.Router();  // Définir `router`

// Middleware
app.use(express.json());
app.use(cors());
app.use(logger("dev"));



// Utiliser `router` comme middleware
app.use("/api/evaluation", router);

// Routes importées
app.use("/api/evaluation", Evaluation);


// Route POST pour créer une évaluation
router.post("/evaluation", async (req, res) => {
  try {
    const evaluation = new evaluation(req.body); // Crée une nouvelle instance du modèle
    await evaluation.save(); // Sauvegarde dans la base MongoDB
    res.status(201).json({ message: "Évaluation ajoutée avec succès", data: evaluation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la création de l'évaluation" });
  }
});

// Gestion des erreurs serveur
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Erreur serveur" });
});

module.exports = app;
