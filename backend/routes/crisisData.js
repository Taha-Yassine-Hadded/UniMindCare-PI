const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Crisis = require('../Models/crisis');
const User = require('../Models/Users');
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

router.post('/pain-zones', async (req, res) => {
  try {
    const { identifiant, zones_malades } = req.body;
    
    if (!identifiant || !zones_malades || !Array.isArray(zones_malades) || zones_malades.length === 0) {
      return res.status(400).json({ message: "Données invalides" });
    }
    
    // Get user information
    const user = await User.findOne({ Identifiant: identifiant });
    
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    
    // Create a new entry in the Crisis collection
    const newCrisis = new Crisis({
      nom: user.Name,
      identifiant: user.Identifiant,
      classe: user.Classe,
      zones_malades: zones_malades.map(zone => ({
        zone_malade: zone.bodyPart,
        intensite: zone.intensity
      }))
    });
    
    await newCrisis.save();
    
    res.status(201).json({ 
      message: "Données de douleur enregistrées avec succès",
      crisis: newCrisis
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des données de douleur:', error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// Route to get pain history for a student
router.get('/pain-history/:identifiant', async (req, res) => {
  try {
    const { identifiant } = req.params;
    
    // Get the pain history for the student
    const painHistory = await Crisis.find({ identifiant })
      .sort({ date: -1 })
      .limit(10); // Limit to the 10 most recent entries
    
    if (!painHistory || painHistory.length === 0) {
      return res.status(404).json({ message: "Aucun historique de douleur trouvé pour cet étudiant" });
    }
    
    res.json(painHistory);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique des douleurs:', error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

module.exports = router;