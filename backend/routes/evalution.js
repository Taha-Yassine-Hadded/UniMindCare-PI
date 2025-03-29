const express = require("express");
const { body, validationResult } = require("express-validator");
const Evaluation = require("../models/evaluations");
const router = express.Router();

// Middleware personnalisé pour le logging (optionnel)
const logger = (req, res, next) => {
  console.log("Données reçues :", req.body);
  next();
};

router.post(
  "/evaluation",
  [
    // Validation et sanitization
    body("nomEtudiant")
      .notEmpty()
      .withMessage("Le nom de l'étudiant est requis")
      .trim()
      .escape(),
    body("classe")
      .notEmpty()
      .withMessage("La classe est requise")
      .trim()
      .escape(),
    body("matiere")
      .notEmpty()
      .withMessage("La matière est requise")
      .trim()
      .escape(),
    body("dateEvaluation")
      .isISO8601()
      .withMessage("La date est invalide")
      .toDate(), // Convertit en objet Date
    body("reactionCorrection")
      .isIn(["Accepte bien", "Résiste légèrement", "Résiste fortement"])
      .withMessage("Réaction à la correction invalide"),
    body("gestionStress")
      .isIn(["Calme", "Anxieux", "Très stressé"])
      .withMessage("Gestion du stress invalide"),
    body("presence")
      .isIn(["Toujours à l’heure", "Souvent en retard", "Absences fréquentes"])
      .withMessage("Présence invalide"),
    body("expressionEmotionnelle")
      .isIn(["Enthousiaste", "Neutre", "Triste", "Irrité"])
      .withMessage("Expression émotionnelle invalide"),
    body("participationOrale")
      .isIn(["Très active", "Moyenne", "Faible", "Nulle"])
      .withMessage("Participation orale invalide"),
    body("difficultes")
      .optional()
      .isString()
      .trim()
      .escape(),
    body("pointsPositifs")
      .optional()
      .isString()
      .trim()
      .escape(),
    body("axesAmelioration")
      .optional()
      .isString()
      .trim()
      .escape(),
    body("suiviRecommande")
      .optional()
      .isBoolean()
      .toBoolean(), // Convertit en booléen
    body("engagement")
      .optional()
      .isIn([
        "Très impliqué",
        "Moyennement impliqué",
        "Peu impliqué",
        "Pas du tout impliqué",
      ]),
    body("concentration")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("La concentration doit être entre 1 et 5")
      .toInt(), // Convertit en entier
    body("interaction")
      .optional()
      .isIn(["Positives", "Neutres", "Négatives"]),
  ],
  logger, // Ajout du middleware de logging
  async (req, res) => {
    // Vérification des erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const evaluation = new Evaluation(req.body);
      await evaluation.save();

      const formattedEvaluation = {
        ...evaluation.toObject(),
        dateEvaluation: evaluation.dateEvaluation.toISOString().split("T")[0],
      };

      res.status(201).json({
        message: "Évaluation enregistrée avec succès",
        evaluation: formattedEvaluation,
      });
    } catch (error) {
      // Gestion spécifique des erreurs
      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: "Erreur de validation dans la base de données",
          details: error.errors,
        });
      }
      console.error("Erreur serveur:", error);
      res.status(500).json({
        message: "Erreur interne du serveur",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;