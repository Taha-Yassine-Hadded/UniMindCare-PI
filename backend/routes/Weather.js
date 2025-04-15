const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { sendWeatherNotificationsToAllUsers } = require('../services/weatherNotificationService');
// Assurez-vous que l'API renvoie correctement les URLs dans les recommandations

router.get('/latest', async (req, res) => {
  try {
    // Obtenir la date d'aujourd'hui au format YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    // Déterminer le créneau horaire actuel (matin ou après-midi)
    const currentHour = new Date().getHours();
    const currentTimeSlot = currentHour < 12 ? "matin" : "après-midi";
    
    // Utiliser la date d'aujourd'hui par défaut si aucune date n'est spécifiée
    const { timeSlot } = req.query;
    const date = today; // Forcer aujourd'hui
    
    console.log("Recherche des données pour aujourd'hui:", date, "créneau:", timeSlot || currentTimeSlot);
    
    // Construire le filtre avec la date d'aujourd'hui
    const filter = { day: date };
    if (timeSlot) {
      filter.time_slot = timeSlot;
    } else {
      filter.time_slot = currentTimeSlot;
    }
    
    console.log("Recherche dans la collection avec filtre:", filter);
    
    // Rechercher les recommandations météo correspondantes
    const weatherData = await mongoose.connection.db.collection('recommandations_weather')
      .findOne(filter);
    
    if (!weatherData) {
      console.log("Aucune donnée trouvée pour aujourd'hui. Recherche de la dernière entrée disponible.");
      // Si aucune recommandation n'est trouvée pour aujourd'hui,
      // rechercher la dernière recommandation disponible
      const latestWeatherData = await mongoose.connection.db.collection('recommandations_weather')
        .findOne({}, { sort: { day: -1, time_slot: 1 } });
      
      if (!latestWeatherData) {
        console.log("Aucune donnée météo disponible dans la collection.");
        return res.status(404).json({ message: "Aucune donnée météo disponible" });
      }
      
      console.log("Dernière donnée disponible trouvée:", latestWeatherData.day, latestWeatherData.time_slot);
      
      // Vérifier explicitement que l'URL est présente pour éviter des problèmes d'affichage
      if (latestWeatherData.recommandation && !latestWeatherData.recommandation.url) {
        latestWeatherData.recommandation.url = "";
      }
      
      return res.json(latestWeatherData);
    }
    
    // Vérifier explicitement que l'URL est présente pour éviter des problèmes d'affichage
    if (weatherData.recommandation && !weatherData.recommandation.url) {
      weatherData.recommandation.url = "";
    }
    
    console.log("Données météo trouvées pour aujourd'hui:", weatherData.day, weatherData.time_slot);
    res.json(weatherData);
  } catch (error) {
    console.error("Erreur lors de la récupération des données météo:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// Récupérer les données météo pour une période spécifique
router.get('/period', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Construire le filtre en fonction des paramètres fournis
    const filter = {};
    if (startDate && endDate) {
      filter.day = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.day = { $gte: startDate };
    } else if (endDate) {
      filter.day = { $lte: endDate };
    }
    
    // Rechercher les recommandations météo correspondantes
    const weatherData = await mongoose.connection.db.collection('recommandations_weather')
      .find(filter)
      .sort({ day: 1, time_slot: 1 })
      .toArray();
    
    if (!weatherData || weatherData.length === 0) {
      return res.status(404).json({ message: "Aucune donnée météo disponible pour cette période" });
    }
    
    res.json(weatherData);
  } catch (error) {
    console.error("Erreur lors de la récupération des données météo:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// Ajouter une nouvelle recommandation météo manuellement (pour les tests)
router.post('/add', async (req, res) => {
  try {
    const { day, time_slot, temperature, humidity, title, description } = req.body;
    
    if (!day || !time_slot || temperature === undefined || humidity === undefined) {
      return res.status(400).json({ message: "Données incomplètes" });
    }
    
    // Créer un nouvel objet de recommandation météo
    const newWeatherRecommendation = {
      day,
      time_slot,
      mesures: {
        temperature: parseFloat(temperature),
        humidity: parseFloat(humidity)
      },
      recommandation: {
        id: Math.floor(Math.random() * 100),
        type: "advice",
        title: title || "Recommandation météo",
        description: description || "Profitez de cette météo!",
        url: "",
        stats: {
          temperature: parseFloat(temperature),
          humidity: parseFloat(humidity)
        }
      }
    };
    
    // Insérer la nouvelle recommandation dans la collection
    const result = await mongoose.connection.db.collection('recommandations_weather')
      .insertOne(newWeatherRecommendation);
    
    res.status(201).json({ 
      message: "Recommandation météo ajoutée avec succès", 
      id: result.insertedId 
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout de la recommandation météo:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});


router.post('/send-notifications', async (req, res) => {
  try {
    const result = await sendWeatherNotificationsToAllUsers();
    
    if (result.skipped) {
      return res.status(200).json({ 
        status: 'skipped',
        message: 'Notifications météo non envoyées',
        reason: result.reason
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Notifications météo envoyées avec succès',
      result
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi des notifications météo:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

module.exports = router;