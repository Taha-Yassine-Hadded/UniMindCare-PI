
require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var createError = require('http-errors');
var path = require('path');
var logger = require('morgan');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const axios = require('axios');
const FaceIDUser = require("./faceIDUser");
const bodyParser = require('body-parser');

const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');


// ... configuration Express, middleware, etc.


// Initialize Express app
var app = express();

app.use(cors());
app.use(bodyParser.json());

// view engine setup
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);


// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));






//Partie Houssine 
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
// Partie statistiques
// Importer la route de statistiques
const usersStatisticsRoutes = require('./routes/usersStatistics');

// Monter la route pour les statistiques sous /api/users/statistics
app.use('/api/usersStat', usersStatisticsRoutes);

//Partie Email : 
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
// Nodemailer Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Import du modèle Mongoose
const User = require('./models/Users');

app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Searching for email:', email);

    // Recherche dans la collection en utilisant le champ "Email"
    const directResult = await mongoose.connection.db.collection('users').findOne({
      Email: new RegExp(`^${email}$`, 'i')
    });
    console.log('Direct MongoDB query result:', directResult);

    if (!directResult) {
      console.log('No user found in direct query');
      return res.status(404).send('Utilisateur non trouvé');
    }

    // Conversion de l'objet brut en document Mongoose pour la mise à jour
    const user = User.hydrate(directResult);
    user.isNew = false; // assure que save() met à jour le document existant

    // Générer et sauvegarder l'OTP
    const otp = crypto.randomInt(1000, 9999).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Envoyer l'email avec l'OTP
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Réinitialisation de mot de passe',
      text: `Votre code OTP est : ${otp}. Il expirera dans 10 minutes.`
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        console.error('Email error:', error);
        return res.status(500).send('Erreur lors de l\'envoi de l\'email');
      }
      res.status(200).send('OTP envoyé par email');
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Erreur serveur');
  }
});

app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const user = await User.findOne({
      Email: new RegExp(`^${email}$`, 'i')
    });
    
    if (!user) {
      return res.status(404).send('Utilisateur non trouvé');
    }

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).send('OTP invalide ou expiré');
    }
    
    res.status(200).send('OTP valide');
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).send('Erreur serveur');
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    // On utilise le modèle Mongoose pour récupérer l'utilisateur
    const user = await User.findOne({
      Email: new RegExp(`^${email}$`, 'i')
    });
    
    if (!user) {
      return res.status(404).send('Utilisateur non trouvé');
    }
    
    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).send('OTP invalide ou expiré');
    }

    // Hacher le nouveau mot de passe avec SHA-256
    const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');

    // Mettre à jour le mot de passe
    user.Password = hashedPassword;

    // Supprimer les champs OTP
    user.otp = undefined;
    user.otpExpires = undefined;

    // Enregistrer l'utilisateur
    await user.save();

    res.status(200).send('Mot de passe réinitialisé avec succès');
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).send('Erreur serveur');
  }
});



// 1/ partie users
     /* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/

   // Importer et utiliser les routes utilisateurs
   const usersRoutesHoussine = require('./routes/usersHoussine');
   app.use('/api/users', usersRoutesHoussine);
 /* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/7




// 2/ partie weather a partie de carte esp32 
   /* /////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
   // Schéma MongoDB pour stocker la température, l'humidité et la date                        */
 
   const DataSchema = new mongoose.Schema({
     temperature: Number,
     humidity: Number,
     date: String
   });
   
   // Modèle MongoDB basé sur le schéma
   const Data = mongoose.model('Data', DataSchema);
   
   // Route POST pour recevoir les données et les stocker dans MongoDB
   app.post('/api/ajouter-donnees', (req, res) => {
     const { temperature, humidity, date } = req.body;
   
     // Créer un nouvel objet avec les données reçues 
     const newData = new Data({
       temperature,
       humidity,
       date
     });
   
     // Sauvegarder l'objet dans MongoDB
     newData.save()
       .then(() => {
         res.status(200).json({ message: 'Données ajoutées avec succès' });
       })
       .catch(err => {
         console.error('Erreur lors de l\'ajout des données: ', err);
         res.status(500).json({ message: 'Erreur interne du serveur' });
       });
   });
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/







// 2/ partie faceID
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/   
   // Enregistrement des utilisateurs FaceID
   app.post("/api/registerUserFaceID", async (req, res) => {
     const { name, identifiant } = req.body;
   
     if (!name || !identifiant) {
       return res.status(400).json({ error: "Nom et identifiant requis" });
     }
   
     try {
       // Création de l'utilisateur avec les données reçues
       const newUser = new FaceIDUser({ name, identifiant });
       await newUser.save();
       res.status(200).json({ message: "Utilisateur enregistré avec succès" });
     } catch (error) {
       res.status(500).json({ error: "Erreur lors de l'enregistrement de l'utilisateur" });
     }
   });
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/













// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;