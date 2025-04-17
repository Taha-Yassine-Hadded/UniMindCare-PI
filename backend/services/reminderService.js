require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const User = require('../Models/User');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
// Configurer le transporteur d'email
const transporterEmail = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Fonction pour envoyer un email de rappel à un utilisateur spécifique
const sendReminderEmail = async (user) => {
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  // Construire l'email HTML avec le même design que celui de Response.js
  const mailHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
      }
      .header {
        background-color: #4a6fdc;
        color: white;
        padding: 20px;
        text-align: center;
        border-radius: 5px 5px 0 0;
      }
      .logo {
        max-width: 150px;
        margin-bottom: 10px;
      }
      .content {
        padding: 20px;
        border: 1px solid #ddd;
        border-top: none;
        border-radius: 0 0 5px 5px;
      }
      .footer {
        text-align: center;
        margin-top: 20px;
        font-size: 12px;
        color: #666;
      }
      .reminder {
        margin: 20px 0;
        padding: 15px;
        background-color: #f9f9f9;
        border-radius: 5px;
      }
      .cta-button {
        display: inline-block;
        background-color: #4a6fdc;
        color: white;
        text-decoration: none;
        padding: 10px 20px;
        border-radius: 5px;
        margin: 20px 0;
        font-weight: bold;
      }
      .badge {
        display: inline-block;
        background-color: #ffd700;
        color: #333;
        padding: 5px 10px;
        border-radius: 20px;
        font-weight: bold;
        margin-top: 15px;
      }
      .quote {
        font-style: italic;
        color: #4a6fdc;
        text-align: center;
        margin: 20px 0;
        padding: 10px;
        border-left: 3px solid #4a6fdc;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <img src="http://localhost:5000/images/logo2.png" alt="UniMindCare Logo" class="logo">
      <h1>UniMindCare</h1>
      <p>Questionnaire hebdomadaire de bien-être</p>
    </div>
    
    <div class="content">
      <p>Bonjour ${user.Name || 'Étudiant(e)'},</p>
      
      <p>Votre bien-être est notre priorité ! Nous vous rappelons que notre questionnaire de bien-être est <strong>maintenant disponible</strong> pour cette semaine.</p>
      
      <div class="reminder">
        <h2>🎉 C'est mardi : le questionnaire est ouvert !</h2>
        
        <p class="quote">"Prendre soin de sa santé mentale est aussi important que prendre soin de sa santé physique. Un moment de réflexion aujourd'hui peut transformer votre demain."</p>
        
        <p>En seulement quelques minutes, vous pouvez :</p>
        <ul>
          <li>Évaluer votre état émotionnel actuel</li>
          <li>Recevoir des recommandations personnalisées</li>
          <li>Suivre l'évolution de votre bien-être au fil du temps</li>
        </ul>
      </div>
      
      <p><span class="badge">+20 points</span> Complétez le questionnaire et gagnez 20 points pour votre profil !</p>
      
      <div style="text-align: center;">
        <a href="http://localhost:3000/tivo/forms/form-control/form-validation" class="cta-button">Compléter le questionnaire maintenant</a>
      </div>
      
      <p><strong>Important :</strong> Le questionnaire est uniquement disponible le mercredi. Ne manquez pas cette occasion !</p>
      
      <p>Cordialement,<br>L'équipe UniMindCare</p>
    </div>
    
    <div class="footer">
      <p>Ce message a été généré automatiquement. Merci de ne pas y répondre.</p>
      <p>UniMindCare © 2025 - Tous droits réservés</p>
    </div>
  </body>
  </html>
  `;
  
  
  // Options de l'email
  const mailOptions = {
    from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
    to: user.Email,
    subject: '📝 Rappel : Questionnaire de bien-être disponible aujourd\'hui',
    html: mailHtml
  };
  
  // Envoi de l'email
  try {
    await transporterEmail.sendMail(mailOptions);
    console.log(`Email de rappel envoyé avec succès à ${user.Email}`);
    return true;
  } catch (error) {
    console.error(`Erreur lors de l'envoi du rappel à ${user.Email}:`, error);
    return false;
  }
};

// Fonction principale pour envoyer des rappels à tous les utilisateurs
const sendRemindersToAllUsers = async () => {
  try {
    // Récupérer tous les utilisateurs (vous pouvez ajouter des filtres si nécessaire)
    const users = await User.find({ verified: true });
    console.log(`Envoi de rappels à ${users.length} utilisateurs`);
    
    let successCount = 0;
    let failCount = 0;
    
    // Envoyer des emails à chaque utilisateur
    for (const user of users) {
      const success = await sendReminderEmail(user);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    console.log(`Rappels envoyés : ${successCount} réussis, ${failCount} échoués`);
    return { success: successCount, failed: failCount };
  } catch (error) {
    console.error("Erreur lors de l'envoi des rappels:", error);
    throw error;
  }
};

module.exports = {
  sendReminderEmail,
  sendRemindersToAllUsers
};