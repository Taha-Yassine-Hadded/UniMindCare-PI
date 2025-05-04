const cron = require('node-cron');
const { sendRemindersToAllUsers } = require('../services/reminderService');
const { sendWeatherNotificationsToAllUsers } = require('../services/weatherNotificationService');
const {
  sendUpcomingAppointmentReminders,
  sendTodaySessionsReminders
} = require('../services/appointementReminderService');

// Fonction pour initialiser les tâches planifiées
const initScheduler = () => {
  // Configuration du fuseau horaire local correct
  const localTimezone = "Europe/Paris"; 
  
  // 1. Planificateur pour les rappels d'emails hebdomadaires (questionnaire)
  cron.schedule('30 10 * * *', async () => {
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
  
  console.log(`Planificateur initialisé : les rappels de questionnaire seront envoyés à 10h30 (${localTimezone})`);
  
  // 2. Planificateur pour l'envoi des notifications météo
  cron.schedule('30 10 * * *', async () => {
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
  
  // 3. NOUVEAU: Planificateur pour les rappels de rendez-vous (24h avant)
  cron.schedule('0 17 * * *', async () => {
    console.log('Exécution de la tâche planifiée : Envoi des rappels de rendez-vous');
    try {
      const result = await sendUpcomingAppointmentReminders();
      console.log(`Rappels de rendez-vous : ${result.success} envoyés avec succès, ${result.failed} échecs`);
    } catch (error) {
      console.error('Erreur lors de l\'envoi des rappels de rendez-vous:', error);
    }
  }, {
    scheduled: true,
    timezone: localTimezone
  });
  
  console.log(`Planificateur initialisé : les rappels de rendez-vous seront envoyés à 17h00 (${localTimezone})`);
  
  // 4. NOUVEAU: Planificateur pour les récapitulatifs des séances du jour aux psychologues
  cron.schedule('0 7 * * *', async () => {
    console.log('Exécution de la tâche planifiée : Envoi des récapitulatifs des séances');
    try {
      const result = await sendTodaySessionsReminders();
      console.log(`Récapitulatifs des séances : ${result.success} envoyés avec succès, ${result.failed} échecs`);
    } catch (error) {
      console.error('Erreur lors de l\'envoi des récapitulatifs des séances:', error);
    }
  }, {
    scheduled: true,
    timezone: localTimezone
  });
  
  console.log(`Planificateur initialisé : les récapitulatifs des séances seront envoyés à 7h00 (${localTimezone})`);
  
  // Afficher l'heure actuelle au démarrage pour vérifier
  const now = new Date();
  console.log(`Heure actuelle du système: ${now.toLocaleTimeString()} ${now.toLocaleDateString()}`);
  console.log(`Tous les planificateurs ont été initialisés avec succès`);
};

module.exports = {
  initScheduler
};