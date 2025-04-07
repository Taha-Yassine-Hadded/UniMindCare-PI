const express = require("express");
const { body, validationResult } = require("express-validator");
const Feedback = require("../Models/Feedback");
const Users = require("../Models/Users");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Middleware pour logging
const logger = (req, res, next) => {
  console.log("Données reçues :", req.body);
  next();
};

// Middleware pour vérifier le jeton JWT et le rôle "student"
const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Token manquant" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Users.findById(decoded.userId);
    if (!user || !user.Role.includes("student")) {
      return res.status(403).json({ message: "Accès refusé : réservé aux étudiants" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Erreur lors de la vérification du jeton :", error);
    return res.status(401).json({ message: "Token invalide" });
  }
};
router.get("/teachers", async (req, res) => {
  try {
    const teachers = await Feedback.distinct("nomEnseignant");
    res.status(200).json({ teachers });
  } catch (error) {
    console.error("Erreur lors de la récupération des enseignants :", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

router.post(
  "/feedback",
  authenticateToken,
  [
    body("nomEnseignant")
      .notEmpty()
      .withMessage("Le nom de l'enseignant est requis")
      .trim()
      .escape(),
    body("matiere")
      .notEmpty()
      .withMessage("La matière est requise")
      .trim()
      .escape(),
    body("dateSession")
      .isISO8601()
      .withMessage("La date est invalide")
      .toDate(),
    body("clarteExplications")
      .isIn(["Très claire", "Clair", "Moyen", "Peu clair"])
      .withMessage("Clarté des explications invalide"),
    body("interactionEtudiant")
      .isIn(["Très positive", "Positive", "Neutre", "Négative"])
      .withMessage("Interaction invalide"),
    body("disponibilite")
      .isIn(["Toujours disponible", "Souvent disponible", "Rarement disponible", "Jamais disponible"])
      .withMessage("Disponibilité invalide"),
    body("gestionCours")
      .isIn(["Excellente", "Bonne", "Moyenne", "Mauvaise"])
      .withMessage("Gestion du cours invalide"),
    body("satisfactionGlobale")
      .isInt({ min: 1, max: 5 })
      .withMessage("La satisfaction globale doit être entre 1 et 5")
      .toInt(),
    body("commentaire")
      .optional()
      .isString()
      .trim()
      .escape(),
  ],
  logger,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const feedback = new Feedback({
        ...req.body,
        submittedBy: req.user._id, // Associer le feedback à l'étudiant authentifié
      });
      await feedback.save();

      const formattedFeedback = {
        ...feedback.toObject(),
        dateSession: feedback.dateSession.toISOString().split("T")[0],
      };

      res.status(201).json({
        message: "Feedback enregistré avec succès",
        feedback: formattedFeedback,
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

module.exports = router;