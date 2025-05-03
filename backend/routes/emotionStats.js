const express = require('express');
const router = express.Router();
const ResultatsStudentsEmotions = require('../Models/ResultatsStudentsEmotions');

// Route pour récupérer toutes les données
router.get('/all', async (req, res) => {
  try {
    const resultats = await ResultatsStudentsEmotions.find()
                                                     .sort({ timestamp: -1 })
                                                     .limit(100);
    res.status(200).json(resultats);
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des données' });
  }
});

// Route pour récupérer les statistiques agrégées
// Dans la route pour récupérer les statistiques agrégées
router.get('/stats', async (req, res) => {
    try {
      // Statistiques par geste
      const gestureStats = await ResultatsStudentsEmotions.aggregate([
        {
          $group: {
            _id: "$gesture",
            count: { $sum: 1 },
            speechTexts: { $push: { $ifNull: ["$speech_text", "Non spécifié"] } }
          }
        },
        { $sort: { count: -1 } }
      ]);
  
      // Statistiques par mot-clé
      const keywordStats = await ResultatsStudentsEmotions.aggregate([
        { $match: { keywords: { $ne: null, $exists: true, $not: { $size: 0 } } } },
        { $unwind: "$keywords" },
        {
          $group: {
            _id: "$keywords",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
  
      // Statistiques des textes de parole
      const speechStats = await ResultatsStudentsEmotions.aggregate([
        { $match: { speech_text: { $ne: null } } },
        {
          $group: {
            _id: "$speech_text",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
  
      // Statistiques par jour
      const dailyStats = await ResultatsStudentsEmotions.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$timestamp" },
              month: { $month: "$timestamp" },
              day: { $dayOfMonth: "$timestamp" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
        { $limit: 30 }
      ]);
  
      res.status(200).json({
        gestureStats,
        keywordStats,
        speechStats,
        dailyStats
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques' });
    }
  });

module.exports = router;