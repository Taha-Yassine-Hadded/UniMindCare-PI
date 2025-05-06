const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { sendWeatherNotificationsToAllUsers } = require('../services/weatherNotificationService');
const validator = require('validator');

// Helper: Validate YYYY-MM-DD date
function isValidDate(str) {
  return validator.isISO8601(str, { strict: true }) && /^\d{4}-\d{2}-\d{2}$/.test(str);
}

// Helper: Validate time slot
function isValidTimeSlot(slot) {
  return ['matin', 'après-midi'].includes(slot);
}

// GET /api/weather/latest
router.get('/latest', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();
    const currentTimeSlot = currentHour < 12 ? "matin" : "après-midi";
    const { timeSlot } = req.query;
    const date = today;

    // Validate timeSlot if provided
    if (timeSlot && !isValidTimeSlot(timeSlot)) {
      return res.status(400).json({ message: "Créneau horaire invalide" });
    }

    const filter = { day: date, time_slot: timeSlot || currentTimeSlot };

    // Find today's weather data
    const weatherData = await mongoose.connection.db.collection('recommandations_weather')
      .findOne(filter);

    if (!weatherData) {
      // Fallback: find the latest available entry
      const latestWeatherData = await mongoose.connection.db.collection('recommandations_weather')
        .findOne({}, { sort: { day: -1, time_slot: 1 } });

      if (!latestWeatherData) {
        return res.status(404).json({ message: "Aucune donnée météo disponible" });
      }

      if (latestWeatherData.recommandation && !latestWeatherData.recommandation.url) {
        latestWeatherData.recommandation.url = "";
      }

      return res.json(latestWeatherData);
    }

    if (weatherData.recommandation && !weatherData.recommandation.url) {
      weatherData.recommandation.url = "";
    }

    res.json(weatherData);
  } catch (error) {
    console.error("Erreur lors de la récupération des données météo:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /api/weather/period
router.get('/period', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate dates
    if ((startDate && !isValidDate(startDate)) || (endDate && !isValidDate(endDate))) {
      return res.status(400).json({ message: "Format de date invalide (YYYY-MM-DD attendu)" });
    }

    const filter = {};
    if (startDate && endDate) {
      filter.day = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.day = { $gte: startDate };
    } else if (endDate) {
      filter.day = { $lte: endDate };
    }

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
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /api/weather/add (admin/test only)
router.post('/add', async (req, res) => {
  try {
    const { day, time_slot, temperature, humidity, title, description } = req.body;

    // Validate input
    if (!day || !time_slot || temperature === undefined || humidity === undefined) {
      return res.status(400).json({ message: "Données incomplètes" });
    }
    if (!isValidDate(day)) {
      return res.status(400).json({ message: "Format de date invalide (YYYY-MM-DD attendu)" });
    }
    if (!isValidTimeSlot(time_slot)) {
      return res.status(400).json({ message: "Créneau horaire invalide" });
    }
    if (!validator.isFloat(temperature.toString()) || !validator.isFloat(humidity.toString())) {
      return res.status(400).json({ message: "Température ou humidité invalide" });
    }

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

    const result = await mongoose.connection.db.collection('recommandations_weather')
      .insertOne(newWeatherRecommendation);

    res.status(201).json({
      message: "Recommandation météo ajoutée avec succès",
      id: result.insertedId
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout de la recommandation météo:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /api/weather/send-notifications
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
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;