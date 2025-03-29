const express = require('express');
const router = express.Router();
const User = require('../Models/Users');

// Route GET pour récupérer les statistiques sur les utilisateurs
router.get('/statistics', async (req, res) => {
  try {
    // Nombre total d'utilisateurs
    const totalUsers = await User.countDocuments({});

    // Statistiques par rôle (exemple : Étudiant, Professeur, etc.)
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: "$Role", // regrouper par rôle
          count: { $sum: 1 }
        }
      }
    ]);

    // Statistiques par classe (si le champ "Classe" est renseigné)
    const classStats = await User.aggregate([
      {
        $group: {
          _id: "$Classe", // regrouper par classe
          count: { $sum: 1 }
        }
      }
    ]);

    // Création d'un objet statique contenant toutes les statistiques
    const stats = {
      totalUsers,
      roleStats,
      classStats
    };

    res.json(stats);
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
