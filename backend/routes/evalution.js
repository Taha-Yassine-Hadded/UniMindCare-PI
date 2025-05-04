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
    body("nomEtudiant").notEmpty().withMessage("Le nom de l'étudiant est requis").trim().escape(),
    body("classe").notEmpty().withMessage("La classe est requise").trim().escape(),
    body("matiere").notEmpty().withMessage("La matière est requise").trim().escape(),
    body("dateEvaluation").isISO8601().withMessage("La date est invalide").toDate(),
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
    body("difficultes").optional().isString().trim().escape(),
    body("pointsPositifs").optional().isString().trim().escape(),
    body("axesAmelioration").optional().isString().trim().escape(),
    body("suiviRecommande").optional().isBoolean().toBoolean(),
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
      .toInt(),
    body("interaction")
      .optional()
      .isIn(["Positives", "Neutres", "Négatives"]),
  ],
  logger,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "Token manquant" });
      }

      // Récupérer l'utilisateur connecté
      const userResponse = await fetch("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await userResponse.json();
      if (!userResponse.ok || !user.Role.includes("teacher")) {
        return res.status(403).json({ message: "Accès refusé" });
      }

      // Ajouter l'ID de l'enseignant à l'évaluation
      const evaluationData = {
        ...req.body,
        createdBy: user._id, // Ajout de l'ID de l'enseignant
      };

      const evaluation = new Evaluation(evaluationData);
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

router.get("/evaluation", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token manquant" });
    }

    // Fetch user details to verify role
    const userResponse = await fetch("http://localhost:5000/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = await userResponse.json();
    if (!userResponse.ok || !user.Role.includes("teacher")) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    // Fetch evaluations for this teacher only
    const evaluations = await Evaluation.find({ createdBy: user._id }).lean();
    const formattedEvaluations = evaluations.map((evaluation) => ({
      ...evaluation,
      dateEvaluation: evaluation.dateEvaluation.toISOString().split("T")[0],
    }));

    res.status(200).json({
      message: "Évaluations récupérées avec succès",
      evaluations: formattedEvaluations,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des évaluations:", error);
    res.status(500).json({
      message: "Erreur interne du serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.get("/evaluation/:id", async (req, res) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id).lean();
    if (!evaluation) {
      return res.status(404).json({ message: "Évaluation non trouvée" });
    }
    res.status(200).json({
      message: "Évaluation récupérée avec succès",
      evaluation: {
        ...evaluation,
        dateEvaluation: evaluation.dateEvaluation.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

// Route pour les statistiques par classe
router.get("/statistics", async (req, res) => {
  try {
    const stats = await Evaluation.aggregate([
      {
        $group: {
          _id: "$classe",
          totalEvaluations: { $sum: 1 },
          avgConcentration: { $avg: "$concentration" },
          presenceStats: { $push: "$presence" },
          participationStats: { $push: "$participationOrale" },
          stressStats: { $push: "$gestionStress" },
          engagementStats: { $push: "$engagement" },
        },
      },
      {
        $project: {
          totalEvaluations: 1,
          avgConcentration: { $round: ["$avgConcentration", 2] },
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
        $sort: { _id: 1 },
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

// Route pour récupérer la liste des étudiants
router.get("/students", async (req, res) => {
  try {
    const students = await Evaluation.distinct("nomEtudiant");
    res.status(200).json({ students });
  } catch (error) {
    console.error("Erreur lors de la récupération des étudiants :", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

// Route pour les statistiques par étudiant
router.get("/student-stats/:nomEtudiant", async (req, res) => {
  try {
    const { nomEtudiant } = req.params;

    const stats = await Evaluation.aggregate([
      {
        $match: { nomEtudiant: nomEtudiant }
      },
      {
        $group: {
          _id: "$nomEtudiant",
          totalEvaluations: { $sum: 1 },
          avgConcentration: { $avg: "$concentration" },
          presenceStats: { $push: "$presence" },
          participationStats: { $push: "$participationOrale" },
          stressStats: { $push: "$gestionStress" },
          engagementStats: { $push: "$engagement" },
          latestEvaluations: { 
            $push: { 
              date: "$dateEvaluation", 
              matiere: "$matiere",
              reactionCorrection: "$reactionCorrection"
            } 
          }
        }
      },
      {
        $project: {
          totalEvaluations: 1,
          avgConcentration: { $round: ["$avgConcentration", 2] },
          presenceDistribution: {
            $arrayToObject: {
              $map: {
                input: ["Toujours à l’heure", "Souvent en retard", "Absences fréquentes"],
                as: "key",
                in: {
                  k: "$$key",
                  v: {
                    $size: {
                      $filter: { input: "$presenceStats", cond: { $eq: ["$$this", "$$key"] } }
                    }
                  }
                }
              }
            }
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
                      $filter: { input: "$participationStats", cond: { $eq: ["$$this", "$$key"] } }
                    }
                  }
                }
              }
            }
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
                      $filter: { input: "$stressStats", cond: { $eq: ["$$this", "$$key"] } }
                    }
                  }
                }
              }
            }
          },
          engagementDistribution: {
            $arrayToObject: {
              $map: {
                input: [
                  "Très impliqué",
                  "Moyennement impliqué",
                  "Peu impliqué",
                  "Pas du tout impliqué"
                ],
                as: "key",
                in: {
                  k: "$$key",
                  v: {
                    $size: {
                      $filter: { input: "$engagementStats", cond: { $eq: ["$$this", "$$key"] } }
                    }
                  }
                }
              }
            }
          },
          latestEvaluations: { $slice: ["$latestEvaluations", 5] }
        }
      }
    ]);

    if (!stats.length) {
      return res.status(404).json({
        message: "Aucune évaluation trouvée pour cet étudiant"
      });
    }

    res.status(200).json({
      message: "Statistiques récupérées avec succès",
      statistics: stats[0]
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    res.status(500).json({
      message: "Erreur interne du serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

module.exports = router;