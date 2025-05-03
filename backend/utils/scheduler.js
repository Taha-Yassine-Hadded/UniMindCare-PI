const cron = require('node-cron');
const { sendRemindersToAllUsers } = require('../services/reminderService');
const { sendWeatherNotificationsToAllUsers } = require('../services/weatherNotificationService');

// Fonction pour initialiser les tâches planifiées
const initScheduler = () => {
  const localTimezone = "Europe/Paris"; 
  
  // 1. Planificateur pour les rappels d'emails hebdomadaires
  cron.schedule('01 12 * * *', async () => {
    console.log('Exécution de la tâche planifiée : envoi des rappels de questionnaire');
    try {
      const result = await sendRemindersToAllUsers();
      console.log(`Tâche terminée : ${result.success} emails envoyés avec succès, ${result.failed} échecs`);
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la tâche planifiée :', error);
    }
  }, {
    scheduled: true,
    timezone: localTimezone
  });
  
  console.log(`Planificateur initialisé : les rappels seront envoyés à 13h58 (${localTimezone})`);
  
  // 2. Planificateur pour l'envoi des notifications météo
  cron.schedule('01 12 * * *', async () => {
    console.log(`Exécution planifiée à ${new Date().toLocaleTimeString()} : envoi des notifications météo quotidiennes`);
    try {
      const result = await sendWeatherNotificationsToAllUsers();
      if (result.skipped) {
        console.log(`Notifications météo non envoyées : ${result.reason}`);
      } else {
        console.log(`Tâche terminée : 
          Emails - ${result.email.success} envoyés avec succès, ${result.email.failed} échecs
          Total utilisateurs: ${result.total}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi des notifications météo :', error);
    }
  }, {
    scheduled: true,
    timezone: localTimezone
  });
  
  // Afficher l'heure actuelle au démarrage pour vérifier
  const now = new Date();
  console.log(`Heure actuelle du système: ${now.toLocaleTimeString()} ${now.toLocaleDateString()}`);
  console.log(`Planificateur initialisé : les notifications météo seront envoyées tous les jours à 20h10 (${localTimezone})`);
};

module.exports = {
  initScheduler
};