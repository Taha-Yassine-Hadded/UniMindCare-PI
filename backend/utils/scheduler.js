const cron = require('node-cron');
const { sendRemindersToAllUsers } = require('../services/reminderService');

// Fonction pour initialiser les tâches planifiées
const initScheduler = () => {
  // Envoyer des rappels tous les samedis à 9h du matin
  cron.schedule('52 14 * * *', async () => {
    console.log('Exécution de la tâche planifiée : envoi des rappels de questionnaire');
    try {
      const result = await sendRemindersToAllUsers();
      console.log(`Tâche terminée : ${result.success} emails envoyés avec succès, ${result.failed} échecs`);
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la tâche planifiée :', error);
    }
  }, {
    scheduled: true,
    timezone: "Europe/Paris" // Ajustez selon votre fuseau horaire
  });
  
  console.log('Planificateur initialisé : les rappels seront envoyés tous les samedis à 9h');
};

module.exports = {
  initScheduler
};




/*

const cron = require('node-cron');
const { sendRemindersToAllUsers } = require('../services/reminderService');

// Fonction pour initialiser les tâches planifiées
const initScheduler = () => {
  // Envoyer des rappels à 14:08 pour tester (au lieu de "tous les samedis à 9h")
  cron.schedule('8 14 * * *', async () => {
    console.log('TEST - Exécution de la tâche planifiée : envoi des rappels de questionnaire');
    try {
      const result = await sendRemindersToAllUsers();
      console.log(`TEST - Tâche terminée à ${new Date().toLocaleTimeString()} : ${result.success} emails envoyés avec succès, ${result.failed} échecs`);
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la tâche planifiée :', error);
    }
  }, {
    scheduled: true
    // Suppression du timezone pour simplifier le test
  });
  
  console.log('Planificateur initialisé : TEST - les rappels seront envoyés à 14:08');
};

module.exports = {
  initScheduler
};


*/