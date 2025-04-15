require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const twilio = require('twilio');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const config = require('../config/notification');
const User = require('../Models/Users');

// Initialiser le client Twilio
const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

// Configurer le transporteur de mail
const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'votre_email@gmail.com',
    pass: process.env.EMAIL_PASS || 'votre_mot_de_passe'
  },
  tls: {
    rejectUnauthorized: false
  },
  debug: true
});

/**
 * Récupère les données météo du jour
 */
const getTodayWeatherData = async () => {
  // Obtenir la date d'aujourd'hui au format YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  
  // Déterminer le créneau horaire actuel (matin ou après-midi)
  const currentHour = new Date().getHours();
  // Utiliser les deux variantes possibles du tiret pour "après-midi"
  const currentTimeSlot = currentHour < 12 ? "matin" : "après-midi";
  
  console.log("Recherche des données météo pour aujourd'hui avec date:", today);
  
  // Essayons d'abord avec la date exacte sans se préoccuper du format du tiret
  let weatherData = await mongoose.connection.db.collection('recommandations_weather')
    .findOne({ day: today });
  
  // Si on trouve des données pour aujourd'hui, on les renvoie
  if (weatherData) {
    console.log("Données météo trouvées pour aujourd'hui sans filtrer par créneau:", weatherData.time_slot);
    return weatherData;
  }
  
  // Si aucune donnée n'est trouvée pour aujourd'hui avec un tiret normal,
  // essayons une requête plus flexible qui ignore la distinction entre les types de tirets
  console.log("Aucune donnée trouvée avec la méthode standard, essai avec une recherche flexible...");
  
  // Utiliser une expression régulière pour faire correspondre les formats de date
  const pipeline = [
    {
      $match: {
        day: today
      }
    },
    {
      $sort: { 
        time_slot: 1 // Trier par créneau pour avoir "matin" avant "après-midi"
      }
    }
  ];
  
  const results = await mongoose.connection.db.collection('recommandations_weather')
    .aggregate(pipeline)
    .toArray();
  
  if (results && results.length > 0) {
    console.log(`Trouvé ${results.length} entrées pour aujourd'hui via pipeline aggregation`);
    return results[0]; // Retourner la première entrée trouvée
  }
  
  console.log("Aucune donnée météo trouvée pour aujourd'hui même avec recherche flexible");
  return null;
};

/**
 * Récupère tous les utilisateurs actifs avec leurs coordonnées
 */
const getActiveUsers = async () => {
  return await User.find({ 
    enabled: true, // Utilisez 'enabled' au lieu de 'active'
    $or: [
      { Email: { $exists: true, $ne: "" } },
      { PhoneNumber: { $exists: true, $ne: "" } }
    ]
  });
};

/**
 * Génère le contenu HTML pour l'email météo
 */
const generateWeatherEmailHTML = (userData, weatherData) => {
  const { temperature, humidity } = weatherData.mesures;
  const { title, description, url } = weatherData.recommandation;
  
  // Déterminer la couleur en fonction de la température
  let tempColor = '#3B82F6'; // bleu par défaut
  if (temperature > 30) tempColor = '#EF4444'; // rouge pour chaleur
  else if (temperature > 25) tempColor = '#F59E0B'; // orange pour chaud
  else if (temperature < 5) tempColor = '#60A5FA'; // bleu clair pour froid
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>UniMindCare - Bulletin Météo</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333333;
          margin: 0;
          padding: 0;
          background-color: #f9fafb;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #4F46E5, #7C3AED);
          padding: 24px;
          text-align: center;
          color: white;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .content {
          padding: 30px;
        }
        .greeting {
          font-size: 20px;
          margin-bottom: 20px;
        }
        .weather-card {
          background-color: #f3f4f6;
          border-radius: 12px;
          padding: 25px;
          margin-bottom: 20px;
          border-left: 4px solid ${tempColor};
        }
        .weather-title {
          font-size: 18px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 16px;
        }
        .weather-metrics {
          display: flex;
          justify-content: space-around;
          margin-bottom: 20px;
        }
        .metric {
          text-align: center;
        }
        .metric-value {
          font-size: 26px;
          font-weight: bold;
          color: ${tempColor};
        }
        .metric-unit {
          font-size: 14px;
          color: #6b7280;
        }
        .metric-label {
          font-size: 14px;
          color: #4b5563;
          margin-top: 5px;
        }
        .recommendation {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 20px;
        }
        .recommendation-title {
          font-size: 16px;
          font-weight: bold;
          color: #111827;
          margin-bottom: 10px;
        }
        .recommendation-text {
          color: #4b5563;
          margin-bottom: ${url ? '15px' : '0'};
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #4F46E5, #7C3AED);
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 9999px;
          font-weight: 600;
          margin-top: 10px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          background-color: #f3f4f6;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">UniMindCare</div>
          <div>Bulletin Météo Quotidien</div>
        </div>
        <div class="content">
          <div class="greeting">Bonjour ${userData.Name.split(' ')[0]},</div>
          <p>Voici les informations météorologiques pour aujourd'hui qui pourraient impacter votre bien-être et vos études.</p>
          
          <div class="weather-card">
            <div class="weather-title">Conditions météorologiques actuelles</div>
            <div class="weather-metrics">
              <div class="metric">
                <div class="metric-value">${temperature.toFixed(1)}<span class="metric-unit">°C</span></div>
                <div class="metric-label">Température</div>
              </div>
              <div class="metric">
                <div class="metric-value">${humidity.toFixed(0)}<span class="metric-unit">%</span></div>
                <div class="metric-label">Humidité</div>
              </div>
            </div>
            
            <div class="recommendation">
              <div class="recommendation-title">${title}</div>
              <div class="recommendation-text">${description}</div>
              ${url && url.trim() !== "" ? 
                `<a href="${url}" class="button">En savoir plus</a>` : 
                ''}
            </div>
          </div>
          
          <p>Ces informations sont générées en tenant compte des conditions météorologiques actuelles afin de vous aider à optimiser votre journée.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} UniMindCare. Tous droits réservés.</p>
          <p>Ce message a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Génère le contenu du SMS
 */
const generateWeatherSMSContent = (userData, weatherData) => {
  const { temperature, humidity } = weatherData.mesures;
  const { title, description } = weatherData.recommandation;
  
  return `
UniMindCare - Météo du jour
  
Temp: ${temperature.toFixed(1)}°C | Humidité: ${humidity.toFixed(0)}%

${title}: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}

Pour plus d'infos, consultez votre email ou l'application.
`;
};

/**
 * Envoie un email avec les informations météo
 */
const sendWeatherEmail = async (user, weatherData) => {
  try {
    if (!user.Email) return { success: false, reason: 'Email manquant' };
    
    const mailOptions = {
      from: config.email.from,
      to: user.Email,
      subject: `UniMindCare - Bulletin météo du ${new Date().toLocaleDateString('fr-FR')}`,
      html: generateWeatherEmailHTML(user, weatherData)
    };
    
    const info = await mailTransporter.sendMail(mailOptions);
    console.log(`Email météo envoyé à ${user.Email}: ${info.messageId}`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Erreur lors de l'envoi de l'email météo à ${user.Email}:`, error);
    return { success: false, reason: error.message };
  }
};

/**
 * Formate un numéro de téléphone au format international
 */
const formatPhoneNumber = (phoneNumber) => {
  // Supprimer tous les caractères non numériques
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Si le numéro commence déjà par +, le retourner tel quel
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  // Si c'est un numéro tunisien sans code pays (8 chiffres commençant par 2, 4, 5, 9)
  if (cleaned.length === 8 && /^[2459]/.test(cleaned)) {
    return `+216${cleaned}`;
  }
  
  // Si le numéro ne contient pas de code pays mais commence par 0
  if (cleaned.startsWith('0') && cleaned.length > 9) {
    return `+216${cleaned.substring(1)}`;  // Remplacer le 0 initial par +216
  }
  
  // Si le numéro contient déjà un code pays (généralement > 10 chiffres)
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }
  
  // Par défaut, considérer comme un numéro tunisien
  return `+216${cleaned}`;
};

/**
 * Envoie un SMS avec les informations météo
 */
const sendWeatherSMS = async (user, weatherData) => {
  try {
    if (!user.PhoneNumber) return { success: false, reason: 'Numéro de téléphone manquant' };
    
    // Formater le numéro de téléphone
    const formattedPhoneNumber = formatPhoneNumber(user.PhoneNumber);
    
    // Vérifier que le numéro est valide (au moins 10 caractères avec le +)
    if (formattedPhoneNumber.length < 10) {
      return { 
        success: false, 
        reason: `Numéro de téléphone invalide: ${user.PhoneNumber} (format: ${formattedPhoneNumber})` 
      };
    }
    
    console.log(`Envoi SMS à ${user.Name} au numéro formaté: ${formattedPhoneNumber}`);
    
    const message = await twilioClient.messages.create({
      body: generateWeatherSMSContent(user, weatherData),
      from: config.twilio.phoneNumber,
      to: formattedPhoneNumber
    });
    
    console.log(`SMS météo envoyé à ${formattedPhoneNumber}: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error(`Erreur lors de l'envoi du SMS météo à ${user.PhoneNumber}:`, error);
    return { success: false, reason: error.message };
  }
};

/**
 * Envoie les notifications météo à tous les utilisateurs actifs
 */
const sendWeatherNotificationsToAllUsers = async () => {
  try {
    // Récupérer les données météo du jour
    const weatherData = await getTodayWeatherData();
    
    // Si aucune donnée météo pour aujourd'hui, ne pas envoyer de notifications
    if (!weatherData) {
      console.log("Aucune donnée météo disponible pour aujourd'hui. Notifications non envoyées.");
      return {
        success: 0,
        failed: 0,
        skipped: true,
        reason: "Aucune donnée météo disponible pour aujourd'hui"
      };
    }
    
    // Récupérer tous les utilisateurs actifs
    const users = await getActiveUsers();
    console.log(`${users.length} utilisateurs actifs trouvés pour l'envoi des notifications météo.`);
    
    let emailSuccess = 0;
    let emailFailed = 0;
    let smsSuccess = 0;
    let smsFailed = 0;
    
    // Envoyer les notifications à chaque utilisateur
    for (const user of users) {
      // Envoyer un email si l'utilisateur a un email
      if (user.Email) {
        const emailResult = await sendWeatherEmail(user, weatherData);
        if (emailResult.success) emailSuccess++;
        else emailFailed++;
      }
      
      // Envoyer un SMS si l'utilisateur a un numéro de téléphone
      if (user.PhoneNumber) {
        const smsResult = await sendWeatherSMS(user, weatherData);
        if (smsResult.success) smsSuccess++;
        else smsFailed++;
      }
    }
    
    return {
      email: { success: emailSuccess, failed: emailFailed },
      sms: { success: smsSuccess, failed: smsFailed },
      total: users.length
    };
  } catch (error) {
    console.error("Erreur lors de l'envoi des notifications météo:", error);
    throw error;
  }
};

module.exports = {
  getTodayWeatherData,
  sendWeatherEmail,
  sendWeatherSMS,
  sendWeatherNotificationsToAllUsers
};