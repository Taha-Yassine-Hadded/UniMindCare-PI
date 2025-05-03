require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const Appointment = require('../Models/Appointment');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const moment = require('moment');

// Configurer le transporteur d'email (identique à reminderService.js)
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

/**
 * Envoie un email de rappel de rendez-vous à l'étudiant
 */
const sendAppointmentReminderToStudent = async (appointment, student) => {
  // Formater la date et l'heure du rendez-vous
  const appointmentDate = moment(appointment.appointmentDate).format('dddd, D MMMM YYYY');
  const appointmentTime = moment(appointment.appointmentDate).format('HH:mm');
  
  // Obtenir les informations du psychologue
  const psychologist = await User.findById(appointment.psychologistId);
  const psychologistName = psychologist ? psychologist.Name : 'Votre psychologue';
  
  // HTML pour l'email de rappel
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
      .appointment-details {
        background-color: #f0f7ff;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
        border-left: 4px solid #4a6fdc;
      }
      .calendar-icon {
        font-size: 24px;
        margin-right: 10px;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <img src="http://localhost:5000/images/logo2.png" alt="UniMindCare Logo" class="logo">
      <h1>UniMindCare</h1>
      <p>Rappel de rendez-vous</p>
    </div>
    
    <div class="content">
      <p>Bonjour ${student.Name || 'Étudiant(e)'},</p>
      
      <p>Nous vous rappelons que vous avez un rendez-vous prévu <strong>demain</strong> avec votre psychologue.</p>
      
      <div class="appointment-details">
        <h2>📅 Détails du rendez-vous</h2>
        <p><strong>Date:</strong> ${appointmentDate}</p>
        <p><strong>Heure:</strong> ${appointmentTime}</p>
        <p><strong>Psychologue:</strong> ${psychologistName}</p>
        <p><strong>Mode:</strong> ${appointment.mode || 'En personne'}</p>
        ${appointment.location ? `<p><strong>Lieu:</strong> ${appointment.location}</p>` : ''}
        ${appointment.meetingLink ? `<p><strong>Lien de réunion:</strong> <a href="${appointment.meetingLink}">${appointment.meetingLink}</a></p>` : ''}
      </div>
      
      <div class="reminder">
        <h3>Rappels importants</h3>
        <ul>
          <li>Veuillez arriver 10 minutes avant l'heure prévue.</li>
          <li>Si vous ne pouvez pas assister au rendez-vous, veuillez nous informer au moins 4 heures à l'avance.</li>
          <li>Préparez vos questions ou préoccupations pour optimiser votre séance.</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="http://localhost:3000/tivo/dashboard" class="cta-button">Voir mes rendez-vous</a>
      </div>
      
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
    to: student.Email,
    subject: '📅 Rappel : Votre rendez-vous de demain',
    html: mailHtml
  };
  
  // Envoi de l'email
  try {
    await transporterEmail.sendMail(mailOptions);
    console.log(`Email de rappel de rendez-vous envoyé avec succès à ${student.Email}`);
    return true;
  } catch (error) {
    console.error(`Erreur lors de l'envoi du rappel de rendez-vous à ${student.Email}:`, error);
    return false;
  }
};

/**
 * Envoie un email récapitulatif des séances du jour au psychologue
 */
const sendTodaysSessionsReminderToPsychologist = async (psychologist, appointments) => {
  // Formater la date du jour
  const todayDate = moment().format('dddd, D MMMM YYYY');
  
  // Générer la liste des rendez-vous
  let appointmentsList = '';
  
  if (appointments.length === 0) {
    appointmentsList = `<p>Vous n'avez aucun rendez-vous prévu pour aujourd'hui.</p>`;
  } else {
    appointmentsList = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <thead>
        <tr style="background-color: #f0f7ff;">
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Heure</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Étudiant</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Mode</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Détails</th>
        </tr>
      </thead>
      <tbody>
    `;
    
    for (const appointment of appointments) {
      const student = await User.findById(appointment.studentId);
      const studentName = student ? student.Name : 'Étudiant inconnu';
      const appointmentTime = moment(appointment.appointmentDate).format('HH:mm');
      
      appointmentsList += `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">${appointmentTime}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${studentName}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${appointment.mode || 'En personne'}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">
            ${appointment.location ? `Lieu: ${appointment.location}<br>` : ''}
            ${appointment.meetingLink ? `<a href="${appointment.meetingLink}">Lien de réunion</a>` : ''}
            ${appointment.notes ? `<br>Notes: ${appointment.notes}` : ''}
          </td>
        </tr>
      `;
    }
    
    appointmentsList += `
      </tbody>
    </table>
    `;
  }
  
  // HTML pour l'email de rappel
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
      .session-summary {
        background-color: #f9f9f9;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <img src="http://localhost:5000/images/logo2.png" alt="UniMindCare Logo" class="logo">
      <h1>UniMindCare</h1>
      <p>Récapitulatif des séances du jour</p>
    </div>
    
    <div class="content">
      <p>Bonjour ${psychologist.Name || 'Psychologue'},</p>
      
      <p>Voici un récapitulatif de vos rendez-vous prévus pour aujourd'hui, ${todayDate}.</p>
      
      <div class="session-summary">
        <h2>📋 Vos rendez-vous d'aujourd'hui</h2>
        ${appointmentsList}
      </div>
      
      <div style="text-align: center;">
        <a href="http://localhost:3000/tivo/dashboard/psychologist" class="cta-button">Voir mon planning</a>
      </div>
      
      <p>Bonne journée,<br>L'équipe UniMindCare</p>
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
    to: psychologist.Email,
    subject: '📋 UniMindCare : Vos séances du jour',
    html: mailHtml
  };
  
  // Envoi de l'email
  try {
    await transporterEmail.sendMail(mailOptions);
    console.log(`Email récapitulatif des séances envoyé avec succès à ${psychologist.Email}`);
    return true;
  } catch (error) {
    console.error(`Erreur lors de l'envoi du récapitulatif des séances à ${psychologist.Email}:`, error);
    return false;
  }
};

/**
 * Vérifie les rendez-vous à venir dans les prochaines 24 heures et envoie des rappels aux étudiants
 */
const sendUpcomingAppointmentReminders = async () => {
  try {
    // Date actuelle
    const now = new Date();
    
    // Date dans 24 heures
    const in24Hours = new Date(now);
    in24Hours.setHours(in24Hours.getHours() + 24);
    
    // Trouver tous les rendez-vous qui ont lieu dans les 24 prochaines heures
    const upcomingAppointments = await Appointment.find({
      appointmentDate: { $gt: now, $lt: in24Hours },
      status: { $in: ['confirmed', 'rescheduled'] }
    });
    
    console.log(`Envoi de rappels pour ${upcomingAppointments.length} rendez-vous à venir dans les 24h`);
    
    let successCount = 0;
    let failCount = 0;
    
    // Envoyer des rappels pour chaque rendez-vous
    for (const appointment of upcomingAppointments) {
      // Récupérer les informations de l'étudiant
      const student = await User.findById(appointment.studentId);
      
      if (student) {
        const success = await sendAppointmentReminderToStudent(appointment, student);
        if (success) {
          successCount++;
          
          // Marquer le rendez-vous comme rappelé
          appointment.reminderSent = true;
          await appointment.save();
        } else {
          failCount++;
        }
      } else {
        console.error(`Étudiant non trouvé pour le rendez-vous ID: ${appointment._id}`);
        failCount++;
      }
    }
    
    console.log(`Rappels de rendez-vous envoyés : ${successCount} réussis, ${failCount} échoués`);
    return { success: successCount, failed: failCount };
  } catch (error) {
    console.error("Erreur lors de l'envoi des rappels de rendez-vous:", error);
    throw error;
  }
};

/**
 * Envoie un récapitulatif des séances du jour à tous les psychologues
 */
const sendTodaySessionsReminders = async () => {
  try {
    // Récupérer tous les psychologues
    const psychologists = await User.find({ 
      Role: { $in: ['psychiatre', 'psychologue'] },
      verified: true 
    });
    
    console.log(`Envoi de récapitulatifs à ${psychologists.length} psychologues`);
    
    // Date de début et de fin d'aujourd'hui
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    let successCount = 0;
    let failCount = 0;
    
    // Pour chaque psychologue, récupérer ses rendez-vous du jour et envoyer un récapitulatif
    for (const psychologist of psychologists) {
      // Récupérer les rendez-vous du jour pour ce psychologue
      const todayAppointments = await Appointment.find({
        psychologistId: psychologist._id,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['confirmed', 'rescheduled'] }
      }).sort({ appointmentDate: 1 });
      
      // Envoyer le récapitulatif
      const success = await sendTodaysSessionsReminderToPsychologist(psychologist, todayAppointments);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    console.log(`Récapitulatifs des séances envoyés : ${successCount} réussis, ${failCount} échoués`);
    return { success: successCount, failed: failCount };
  } catch (error) {
    console.error("Erreur lors de l'envoi des récapitulatifs des séances:", error);
    throw error;
  }
};

module.exports = {
  sendAppointmentReminderToStudent,
  sendTodaysSessionsReminderToPsychologist,
  sendUpcomingAppointmentReminders,
  sendTodaySessionsReminders
};