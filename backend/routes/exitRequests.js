const express = require("express");
const { body, validationResult } = require("express-validator");
const ExitRequest = require("../Models/ExitRequest");
const User = require("../Models/Users");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Middleware étudiant
const authenticateStudent = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token manquant" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(403).json({ message: "Utilisateur non trouvé" });
    }
    // Vérifier le rôle en tenant compte d'une valeur chaîne ou tableau
    let isStudent = false;
    if (Array.isArray(user.Role)) {
      isStudent = user.Role.map(r => r.toLowerCase()).includes("student");
    } else if (typeof user.Role === "string") {
      isStudent = user.Role.toLowerCase() === "student";
    }
    // On peut aussi vérifier le tableau user.roles s'il existe
    if (!isStudent && user.roles && Array.isArray(user.roles)) {
      isStudent = user.roles.map(r => r.toLowerCase()).includes("student");
    }
    if (!isStudent) {
      return res.status(403).json({ message: "Accès refusé : réservé aux étudiants" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Erreur d'authentification:", error);
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

// Middleware enseignant
const authenticateTeacher = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token manquant" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(403).json({ message: "Utilisateur non trouvé" });
    }
    let isTeacher = false;
    if (Array.isArray(user.Role)) {
      isTeacher = user.Role.map(r => r.toLowerCase()).includes("teacher");
    } else if (typeof user.Role === "string") {
      isTeacher = user.Role.toLowerCase() === "teacher";
    }
    if (!isTeacher && user.roles && Array.isArray(user.roles)) {
      isTeacher = user.roles.map(r => r.toLowerCase()).includes("teacher");
    }
    if (!isTeacher) {
      return res.status(403).json({ message: "Accès refusé : réservé aux enseignants" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Erreur d'authentification:", error);
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

// 🔹 Soumettre une demande de sortie (pour les étudiants)
router.post(
  "/exit-request",
  authenticateStudent,
  [body("reason").notEmpty().withMessage("La raison est requise").trim().escape()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { reason } = req.body;
    const student = req.user;

    try {
      if (!student.Classe) {
        return res.status(400).json({ message: "Aucune classe assignée à cet étudiant" });
      }

      const teacher = await User.findOne({
        Classe: student.Classe,
        Role: "teacher",
      });
      if (!teacher) {
        return res.status(400).json({ message: "Aucun enseignant assigné à votre classe" });
      }

      if (!teacher.enableExitRequestSorting) {
        return res.status(403).json({ message: "L'enseignant n'a pas activé le tri des sorties" });
      }

      const exitRequest = new ExitRequest({
        studentId: student._id,
        teacherId: teacher._id,
        reason,
        priority: calculatePriority(reason),
      });

      await exitRequest.save();

      const pendingRequests = await ExitRequest.find({
        teacherId: teacher._id,
        status: "pending",
      }).sort({ priority: -1, createdAt: 1 });

      const position = pendingRequests.findIndex((req) =>
        req._id.equals(exitRequest._id)
      ) + 1;

      const responseMessage =
        position === 1
          ? "Votre demande est en tête de liste ! Attendez l'approbation de l'enseignant."
          : `Votre demande est en position ${position} dans la liste d'attente.`;

      res.status(201).json({ message: responseMessage, exitRequest });
    } catch (error) {
      console.error("Erreur serveur:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }
);

// 🔹 Activer/Désactiver le tri des sorties (enseignant uniquement)
router.put("/toggle-exit-sorting", authenticateTeacher, async (req, res) => {
  try {
    const { enable } = req.body;
    const teacher = req.user;
    teacher.enableExitRequestSorting = enable;
    await teacher.save();
    res.status(200).json({ message: `Tri des sorties ${enable ? "activé" : "désactivé"}` });
  } catch (error) {
    console.error("Erreur serveur:", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

// 🔹 Organiser les sorties (enseignant uniquement)
router.post("/organize-exit", authenticateTeacher, async (req, res) => {
  try {
    if (!req.user.enableExitRequestSorting) {
      return res.status(403).json({ message: "Tri des sorties non activé" });
    }
    const requests = await ExitRequest.find({
      teacherId: req.user._id,
      status: "pending",
    });
    const sorted = requests.sort((a, b) => b.priority - a.priority);
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].exitOrder = i + 1;
      await sorted[i].save();
    }
    res.status(200).json({ message: "Sorties organisées", sortedRequests: sorted });
  } catch (error) {
    console.error("Erreur serveur:", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

// 🔹 Autoriser le prochain (enseignant uniquement)
router.post("/approve-next", authenticateTeacher, async (req, res) => {
  try {
    const next = await ExitRequest.findOne({
      teacherId: req.user._id,
      status: "pending",
    }).sort({ exitOrder: 1 });
    if (!next) return res.status(404).json({ message: "Aucune demande restante" });
    next.status = "approved";
    await next.save();
    res.status(200).json({ message: "Étudiant autorisé à sortir", studentId: next.studentId });
  } catch (error) {
    console.error("Erreur serveur:", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

// 🔹 Récupérer les demandes triées (enseignant uniquement)
router.get("/exit-requests", authenticateTeacher, async (req, res) => {
  try {
    const requests = await ExitRequest.find({
      teacherId: req.user._id,
      status: "pending",
    }).populate("studentId", "Name");
    const sorted = requests.sort((a, b) => a.exitOrder - b.exitOrder || b.priority - a.priority);
    res.status(200).json({ sortedRequests: sorted });
  } catch (error) {
    console.error("Erreur serveur:", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

// 🔹 Calcul de priorité
function calculatePriority(reason) {
  const keywords = {
    "urgence médicale": 10,
    "toilette": 5,
    "appel urgent": 8,
    "fatigue": 3,
    "autre": 1,
  };
  let priority = 1;
  for (const [key, value] of Object.entries(keywords)) {
    if (reason.toLowerCase().includes(key)) {
      priority = value;
      break;
    }
  }
  return priority;
}

module.exports = router;