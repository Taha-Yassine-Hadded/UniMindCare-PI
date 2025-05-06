const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Crisis = require('../Models/crisis');
const User = require('../Models/Users');
const validator = require('validator');

// Route to get crisis data for a student by identifiant
router.get('/student/:identifiant', async (req, res) => {
  try {
    const { identifiant } = req.params;
    // Allow alphanumeric and underscores for identifiant
    if (!validator.matches(identifiant, /^[a-zA-Z0-9_]+$/)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const crisisData = await mongoose.connection.db.collection('CrisisResultats')
      .findOne({ identifiant }, { sort: { last_update: -1 } });

    if (!crisisData) {
      return res.status(404).json({ message: 'Aucune donnée de santé trouvée pour cet étudiant' });
    }

    res.json(crisisData);
  } catch (error) {
    console.error('Erreur lors de la récupération des données de crise:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Route to get crisis data for the current user
router.get('/current', async (req, res) => {
  try {
    const userIdentifiant = req.headers['user-identifiant'];
    if (!userIdentifiant || !validator.matches(userIdentifiant, /^[a-zA-Z0-9_]+$/)) {
      return res.status(400).json({ message: 'Identifiant d\'utilisateur non fourni ou invalide' });
    }

    const crisisData = await mongoose.connection.db.collection('CrisisResultats')
      .findOne({ identifiant: userIdentifiant }, { sort: { last_update: -1 } });

    if (!crisisData) {
      return res.status(404).json({ message: 'Aucune donnée de santé trouvée pour cet étudiant' });
    }

    res.json(crisisData);
  } catch (error) {
    console.error('Erreur lors de la récupération des données de crise:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Route to save pain zones
router.post('/pain-zones', async (req, res) => {
  try {
    const { identifiant, zones_malades } = req.body;
    if (!validator.matches(identifiant, /^[a-zA-Z0-9_]+$/)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    if (!Array.isArray(zones_malades) || zones_malades.length === 0) {
      return res.status(400).json({ message: 'Zones malades invalides' });
    }

    // Validate zones_malades structure
    for (const zone of zones_malades) {
      if (!zone.bodyPart || !validator.isLength(zone.bodyPart, { min: 1 }) || !validator.isInt(String(zone.intensity), { min: 0 })) {
        return res.status(400).json({ message: 'Structure des zones malades invalide' });
      }
    }

    const user = await User.findOne({ Identifiant: identifiant });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const newCrisis = new Crisis({
      nom: user.Name,
      identifiant: user.Identifiant,
      classe: user.Classe,
      zones_malades: zones_malades.map(zone => ({
        zone_malade: zone.bodyPart,
        intensite: zone.intensity,
      })),
    });

    await newCrisis.save();
    res.status(201).json({
      message: 'Données de douleur enregistrées avec succès',
      crisis: newCrisis,
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des données de douleur:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Route to get pain history for a student
router.get('/pain-history/:identifiant', async (req, res) => {
  try {
    const { identifiant } = req.params;
    if (!validator.matches(identifiant, /^[a-zA-Z0-9_]+$/)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const painHistory = await Crisis.find({ identifiant })
      .sort({ date: -1 })
      .limit(10);

    if (!painHistory || painHistory.length === 0) {
      return res.status(404).json({ message: 'Aucun historique de douleur trouvé pour cet étudiant' });
    }

    res.json(painHistory);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique des douleurs:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;