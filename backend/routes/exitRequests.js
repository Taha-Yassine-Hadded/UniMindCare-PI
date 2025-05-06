const express = require("express");
const axios = require("axios"); // Ajout de axios
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
    let isStudent = false;
    if (Array.isArray(user.Role)) {
      isStudent = user.Role.map(r => r.toLowerCase()).includes("student");
    } else if (typeof user.Role === "string") {
      isStudent = user.Role.toLowerCase() === "student";
    }
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

// 🔹 Soumettre une demande de sortie (pour les étudiants)
router.post(
  "/exit-request",
  authenticateStudent,
  [body("reason").notEmpty().withMessage("La raison est requise").trim().escape()],
  async (req, res) => {
    console.log("Début de la route /exit-request");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Erreurs de validation:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason } = req.body;
    const student = req.user;
    console.log("Utilisateur:", student);

    try {
      console.log("Vérification de la classe de l'étudiant...");
      if (!student.Classe) {
        console.log("Aucune classe assignée");
        return res.status(400).json({ message: "Aucune classe assignée à cet étudiant" });
      }

      console.log("Recherche de l'enseignant...");
      const teacher = await User.findOne({
        Classe: student.Classe,
        Role: "teacher",
      });
      if (!teacher) {
        console.log("Aucun enseignant trouvé");
        return res.status(400).json({ message: "Aucun enseignant assigné à votre classe" });
      }

      console.log("Vérification du tri des sorties...");
      if (!teacher.enableExitRequestSorting) {
        console.log("Tri des sorties non activé");
        return res.status(403).json({ message: "L'enseignant n'a pas activé le tri des sorties" });
      }

      console.log("Appel à l'API Flask...");
      let flaskResponse;
      try {
        flaskResponse = await axios.post("http://127.0.0.1:5020/exit-request", {
          student_name: student.Name,
          reason: reason
        });
        console.log("Réponse de Flask:", flaskResponse.data);
      } catch (error) {
        console.error("Erreur lors de l'appel à l'API Flask:", error.message);
        return res.status(500).json({ message: "Erreur lors de l'appel à l'API Python" });
      }

      console.log("Stockage de la demande dans MongoDB...");
      const exitRequest = new ExitRequest({
        studentId: student._id,
        teacherId: teacher._id,
        reason,
        priority: 0,
      });

      await exitRequest.save();
      console.log("Demande enregistrée:", exitRequest);

      res.status(201).json({ message: flaskResponse.data.message, exitRequest });
    } catch (error) {
      console.error("Erreur serveur:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  }
);
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
    // Appeler l'API Flask pour approuver la prochaine demande
    let flaskResponse;
    try {
      flaskResponse = await axios.post("http://localhost:5020/approve-next");
    } catch (error) {
      console.error("Erreur lors de l'appel à l'API Flask (approve-next):", error.message);
      return res.status(500).json({ message: "Erreur lors de l'appel à l'API Python" });
    }

    // Mettre à jour la demande dans MongoDB
    const next = await ExitRequest.findOne({
      teacherId: req.user._id,
      status: "pending",
    }).sort({ createdAt: 1 }); // On trie par date pour correspondre à Flask
    if (!next) return res.status(404).json({ message: "Aucune demande restante" });

    next.status = "approved";
    await next.save();

    res.status(200).json({
      message: flaskResponse.data.message,
      studentId: next.studentId
    });
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
    const sorted = requests.sort((a, b) => a.createdAt - b.createdAt); // Tri par date pour correspondre à Flask
    res.status(200).json({ sortedRequests: sorted });
  } catch (error) {
    console.error("Erreur serveur:", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

// 🔹 Calcul de priorité (peut être supprimé si Flask gère tout)
function calculatePriority(reason) {
  if (!reason) return 1;

  // Convertir en minuscules pour l'analyse
  const text = reason.toLowerCase();
  
  // Mots clés avec leurs priorités associées (plus le chiffre est élevé, plus c'est prioritaire)
  const keywords = {
    "urgence médicale": 10,
    "urgence": 9,
    "médical": 9,
    "santé": 8,
    "malade": 8,
    "mal": 7,
    "toilette": 6,
    "wc": 6,
    "appel urgent": 8,
    "appel": 5,
    "téléphone": 5,
    "fatigue": 3,
    "fatigué": 3,
    "manger": 4,
    "boire": 4,
    "soif": 4,
    "faim": 4,
    "peur": 7,
    "angoisse": 7,
    "stress": 6,
    "inquiet": 6,
    "douleur": 8,
    "accident": 10,
    "tête": 7,
    "ventre": 7,
    "respirer": 9,
    "respiration": 9,
    "crise": 10,
    "saigner": 10,
    "sang": 10,
    "autre": 1,
  };
  
  // Trouver le mot clé avec la priorité la plus élevée dans le texte
  let maxPriority = 1; // Priorité par défaut
  
  for (const [key, value] of Object.entries(keywords)) {
    if (text.includes(key) && value > maxPriority) {
      maxPriority = value;
    }
  }
  
  return maxPriority;
}

module.exports = router;