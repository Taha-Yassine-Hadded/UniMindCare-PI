// routes/evaluation.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const Evaluation = require("../models/evaluation");

const router = express.Router();

// Route POST pour créer une évaluation
router.post(
  "/",
  [
    body("nomEtudiant").notEmpty().withMessage("Le nom de l'étudiant est requis"),
    body("classe").notEmpty().withMessage("La classe est requise"),
    body("matiere").notEmpty().withMessage("La matière est requise"),
    body("dateEvaluation").isISO8601().withMessage("La date est invalide"),
    body("engagement").isIn(["Très impliqué", "Moyennement impliqué", "Peu impliqué", "Pas du tout impliqué"]),
    body("concentration").isInt({ min: 1, max: 5 }).withMessage("La concentration doit être entre 1 et 5"),
    body("interaction").isIn(["Positives", "Neutres", "Négatives"]),
    body("reactionCorrection").isIn(["Accepte bien", "Résiste légèrement", "Résiste fortement"]),
    body("gestionStress").isIn(["Calme", "Anxieux", "Très stressé"]),
    body("presence").isIn(["Toujours à l’heure", "Souvent en retard", "Absences fréquentes"]),
    body("expressionEmotionnelle").isIn(["Enthousiaste", "Neutre", "Triste", "Irrité"]),
    body("participationOrale").isIn(["Très active", "Moyenne", "Faible", "Nulle"]),
    body("suiviRecommande").isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const evaluation = new Evaluation(req.body);
      await evaluation.save();
      res.status(201).json({ message: "Évaluation enregistrée avec succès", evaluation });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur lors de l'enregistrement", error: error.message });
    }
  }
);

module.exports = router;
