const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Route pour récupérer les données de crise d'un étudiant par son identifiant
router.get('/student/:identifiant', async (req, res) => {
  try {
    const { identifiant } = req.params;
    
    // Accès direct à la collection existante
    const crisisData = await mongoose.connection.db.collection('CrisisResultats')
      .findOne({ identifiant: identifiant }, { sort: { last_update: -1 } });
    
    if (!crisisData) {
      return res.status(404).json({ message: "Aucune donnée de santé trouvée pour cet étudiant" });
    }
    
    res.json(crisisData);
  } catch (error) {
    console.error('Erreur lors de la récupération des données de crise:', error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// Route pour récupérer les données de l'utilisateur connecté
router.get('/current', async (req, res) => {
  try {
    // Récupérer l'identifiant depuis les données d'authentification ou le token
    // Pour simplifier, on suppose que l'identifiant est passé dans le header
    const userIdentifiant = req.headers['user-identifiant'];
    
    if (!userIdentifiant) {
      return res.status(400).json({ message: "Identifiant d'utilisateur non fourni" });
    }
    
    // Accès direct à la collection existante
    const crisisData = await mongoose.connection.db.collection('CrisisResultats')
      .findOne({ identifiant: userIdentifiant }, { sort: { last_update: -1 } });
    
    if (!crisisData) {
      return res.status(404).json({ message: "Aucune donnée de santé trouvée pour cet étudiant" });
    }
    
    res.json(crisisData);
  } catch (error) {
    console.error('Erreur lors de la récupération des données de crise:', error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

module.exports = router;