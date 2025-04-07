const express = require("express");
const { body, validationResult } = require("express-validator");
const Evaluation = require("../Models/evaluations");
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
// Nouvelle route pour les statistiques par classe
router.get("/statistics", async (req, res) => {
  try {
    const stats = await Evaluation.aggregate([
      {
        $group: {
          _id: "$classe", // Grouper par classe
          totalEvaluations: { $sum: 1 }, // Nombre total d'évaluations
          avgConcentration: { $avg: "$concentration" }, // Moyenne de la concentration
          presenceStats: { $push: "$presence" }, // Collecter les données de présence
          participationStats: { $push: "$participationOrale" }, // Collecter les données de participation
          stressStats: { $push: "$gestionStress" }, // Collecter les données de stress
          engagementStats: { $push: "$engagement" }, // Collecter les données d'engagement
        },
      },
      {
        $project: {
          totalEvaluations: 1,
          avgConcentration: { $round: ["$avgConcentration", 2] }, // Arrondir à 2 décimales
          presenceDistribution: {
            $arrayToObject: {
              $map: {
                input: ["Toujours à l’heure", "Souvent en retard", "Absences fréquentes"],
                as: "key",
                in: {
                  k: "$$key",
                  v: {
                    $size: {
                      $filter: { input: "$presenceStats", cond: { $eq: ["$$this", "$$key"] } },
                    },
                  },
                },
              },
            },
          },
          participationDistribution: {
            $arrayToObject: {
              $map: {
                input: ["Très active", "Moyenne", "Faible", "Nulle"],
                as: "key",
                in: {
                  k: "$$key",
                  v: {
                    $size: {
                      $filter: { input: "$participationStats", cond: { $eq: ["$$this", "$$key"] } },
                    },
                  },
                },
              },
            },
          },
          stressDistribution: {
            $arrayToObject: {
              $map: {
                input: ["Calme", "Anxieux", "Très stressé"],
                as: "key",
                in: {
                  k: "$$key",
                  v: {
                    $size: {
                      $filter: { input: "$stressStats", cond: { $eq: ["$$this", "$$key"] } },
                    },
                  },
                },
              },
            },
          },
          engagementDistribution: {
            $arrayToObject: {
              $map: {
                input: [
                  "Très impliqué",
                  "Moyennement impliqué",
                  "Peu impliqué",
                  "Pas du tout impliqué",
                ],
                as: "key",
                in: {
                  k: "$$key",
                  v: {
                    $size: {
                      $filter: { input: "$engagementStats", cond: { $eq: ["$$this", "$$key"] } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $sort: { _id: 1 }, // Trier par nom de classe
      },
    ]);

    res.status(200).json({
      message: "Statistiques par classe récupérées avec succès",
      statistics: stats,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    res.status(500).json({
      message: "Erreur interne du serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;