const express = require("express");
const { body, validationResult } = require("express-validator");
const Evaluation = require("../models/evaluations"); // Import du modèle
const router = express.Router();

router.post(
  "/evaluation",
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
    body("difficultes").optional().isString(),
    body("pointsPositifs").optional().isString(),
    body("axesAmelioration").optional().isString(),
    body("suiviRecommande").optional().isBoolean(),
  ],
  async (req, res) => {
    // Récupérer les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Retourner les erreurs détaillées dans la réponse
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Créer une nouvelle évaluation avec les données envoyées
      const evaluation = new Evaluation(req.body);

      // Sauvegarder l'évaluation dans la base de données
      await evaluation.save();

      // Formater la date avant de la renvoyer (par exemple, en format lisible)
      const formattedEvaluation = {
        ...evaluation.toObject(),
        dateEvaluation: evaluation.dateEvaluation.toLocaleString(),
      };

      // Retourner un message de succès et l'évaluation enregistrée
      res.status(201).json({ message: "Évaluation enregistrée avec succès", evaluation: formattedEvaluation });
    } catch (error) {
      // Gestion des erreurs lors de l'enregistrement
      console.error(error);
      res.status(500).json({ message: "Erreur lors de l'enregistrement" });
    }
  }
);

module.exports = router;
