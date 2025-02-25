const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true pour utiliser SSL/TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
transporter.verify((error, success) => {
    if (error) {
      console.error('Erreur de connexion SMTP:', error);
    } else {
      console.log('SMTP prêt à envoyer des emails.');
    }
  });

module.exports = transporter;