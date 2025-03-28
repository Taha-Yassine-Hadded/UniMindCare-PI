
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
const FaceIDUser = require("./faceIDUser");
const bodyParser = require('body-parser');
const UserVerification = require('./Models/UserVerification'); 
const User = require('./Models/Users');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');  // Ajouter bcrypt pour le hachage des mots de passe
const crypto = require('crypto');
const multer = require('multer');
const Grid = require('gridfs-stream');
const { GridFsStorage } = require('multer-gridfs-storage');
const transporter = require('./config/emailConfig');
const postsRouter = require('./routes/posts');
const { initScheduler } = require('./utils/scheduler');
const { spawn } = require("child_process");


// Servir les fichiers statiques depuis le dossier images

var indexRouter = require('./routes/index');
var usersRoutes = require('./routes/users');

const passport = require('./routes/passportConfig'); // Import the configured passport instance
const usersRouter = require('./routes/usersRouter');

// Initialize Express app
var app = express();

app.use('/images', express.static(path.join(__dirname, 'images')));

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
app.use("/api/users", usersRoutes);

app.use('/api/posts', postsRouter);


// MongoDB connection
/*mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));*/

   // Connexion à MongoDB
   mongoose.connect('mongodb://localhost/Pi-2025', { useNewUrlParser: true, useUnifiedTopology: true })
     .then(() => console.log('Connexion à MongoDB réussie'))
     .catch(err => console.log('Erreur de connexion à MongoDB: ', err));


/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/

//Partie Salma
// Session configuration (required for Keycloak and Passport)
const memoryStore = new session.MemoryStore();
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
}));

// Initialize Passport for sessions
app.use(passport.initialize());
app.use(passport.session());



app.use('/users', usersRouter);



// Routes
// Authentication routes





  /* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/









//Partie Houssine 
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/


// Partie emergency
const emergencyClaimsRouter = require('./routes/emergencyClaims');
app.use('/api/emergency', emergencyClaimsRouter);

// Servir le dossier uploads pour les images d'urgence
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Partie Crise
const crisisDataRoutes = require('./routes/crisisData');


// Ajouter la route des données de crise
app.use('/api/crisis', crisisDataRoutes);






// Partie meteo
// Importer la route de météo
const weatherRoutes = require('./routes/Weather');
app.use('/api/weather', weatherRoutes);


// Partie questionnaires
// Importer la route de questionnaires
const questionnaireRoutes = require('./routes/Response');

// Ajouter cette ligne avec vos autres routes
app.use('/api/questionnaire', questionnaireRoutes);

// Initialiser le planificateur
initScheduler();


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
const transporterHoussine = nodemailer.createTransport({
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

app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Searching for email:', email);

    // Recherche dans la collection
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

    // Template HTML pour l'email OTP avec le même design
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
        .otp-code {
          font-size: 32px;
          font-weight: bold;
          color: #4a6fdc;
          text-align: center;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 5px;
          margin: 20px 0;
          letter-spacing: 5px;
        }
        .info-box {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 3px solid #4a6fdc;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="http://localhost:5000/images/logo2.png" alt="UniMindCare Logo" class="logo">
        <h1>UniMindCare</h1>
        <p>Réinitialisation de mot de passe</p>
      </div>
      
      <div class="content">
        <p>Bonjour${directResult.Name ? ' ' + directResult.Name : ''},</p>
        
        <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte UniMindCare.</p>
        
        <p>Voici votre code de vérification :</p>
        
        <div class="otp-code">${otp}</div>
        
        <div class="info-box">
          <p><strong>Important :</strong> Ce code est valable pendant 10 minutes. Si vous n'avez pas demandé de réinitialisation de mot de passe, veuillez ignorer cet email.</p>
        </div>
        
        <p>Si vous avez des difficultés à vous connecter, n'hésitez pas à contacter notre équipe de support.</p>
        
        <p>Cordialement,<br>L'équipe UniMindCare</p>
      </div>
      
      <div class="footer">
        <p>Ce message a été généré automatiquement. Merci de ne pas y répondre.</p>
        <p>UniMindCare © 2025 - Tous droits réservés</p>
      </div>
    </body>
    </html>
    `;

    // Options de l'email avec HTML au lieu de texte
    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Réinitialisation de mot de passe',
      html: mailHtml
    };

    transporterHoussine.sendMail(mailOptions, (error) => {
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
    //const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');
    const hashedPassword = await bcrypt.hash(newPassword, 10);


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







// Partie Baha
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
// Fonction de validation de l'email
const validateEmail = (email) => {
  console.log('Email reçu:', email);  // Ajouter un log pour vérifier l'email reçu
  const emailRegex = /^[a-zA-Z0-9._%+-]+@esprit\.tn$/;
  return emailRegex.test(email);
};

const conn = mongoose.connection;
let gfs;

conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
  console.log("GridFS initialisé");
});

const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => {
    return {
      filename: `${Date.now()}-${file.originalname}`,
      bucketName: 'uploads'
    };
  }
});
const upload = multer({ storage });

// Fonction d'enregistrement d'un utilisateur
app.post('/register', upload.single('imageFile'), async (req, res) => {
  const { Name, Identifiant, Email, Password, Classe, Role, PhoneNumber } = req.body;

  // Vérification du rôle
  const validRoles = ["student", "teacher", "psychiatre"];
  if (!validRoles.includes(Role)) {
      return res.status(400).send("Rôle invalide.");
  }

  if (!validateEmail(Email)) {
    return res.status(400).send('L\'email doit être au format @esprit.tn');
  }

  let existingUser = await User.findOne({ $or: [{ Identifiant }, { Email }] });
  if (existingUser) {
    return res.status(400).send('Identifiant ou Email déjà utilisé');
  }

  const hashedPassword = await bcrypt.hash(Password, 10);

  // Si une image est envoyée, on utilise le nom de fichier, sinon on envoie une chaîne vide
  const imageUrl = req.file ? req.file.filename : '';

  const newUser = new User({
    Name,
    Identifiant,
    Email,
    Password: hashedPassword,
    Classe: Role === "student" ? Classe : "",
    Role,
    PhoneNumber,
    imageUrl,
    verified: false
  });

  try {
    const savedUser = await newUser.save();

    // Générer un token
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Enregistrer le code dans UserVerification
    const newVerification = new UserVerification({
      userId: savedUser._id,
      code: verificationCode,
      expiresAt
    });

    await newVerification.save();

    // Envoyer l'email
    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: savedUser.Email,
      subject: 'Vérification de votre compte',
      text: `Votre code de vérification est : ${verificationCode}`,
      html: `<p>Votre code de vérification est :</p><h2>${verificationCode}</h2>`
    };

    await transporter.sendMail(mailOptions);


    res.status(201).send('Utilisateur enregistré avec succès. Vérifiez votre email avec le code envoyé.');
  } catch (err) {
    console.error('Erreur lors de l\'enregistrement:', err);
    res.status(500).send('Erreur lors de l\'enregistrement');
  }
});

app.post('/verify-email', async (req, res) => {
  console.log('Requête reçue:', req.body); // Log pour voir email et code
  try {
    const { email, code } = req.body;
    console.log('Email:', email, 'Code:', code); // Log détaillé

    if (!email || !code) {
      return res.status(400).send("L'email et le code sont requis.");
    }

    // Recherche insensible à la casse
    const user = await User.findOne({ Email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (!user) {
      return res.status(400).send('Utilisateur non trouvé.');
    }

    const verificationRecord = await UserVerification.findOne({ userId: user._id, code });
    if (!verificationRecord || verificationRecord.expiresAt < new Date()) {
      return res.status(400).send('Code invalide ou expiré.');
    }

    await User.findByIdAndUpdate(user._id, { verified: true });
    await UserVerification.findByIdAndDelete(verificationRecord._id);

    res.status(200).send('Compte vérifié avec succès.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur lors de la vérification.');
  }
});




// Endpoint pour récupérer une image
app.get('/image/:filename', async (req, res) => {
  try {
    const file = await gfs.files.findOne({ filename: req.params.filename });
    if (!file || file.length === 0) {
      return res.status(404).send('Image non trouvée');
    }

    const readstream = gfs.createReadStream(file.filename);
    readstream.pipe(res);
  } catch (err) {
    res.status(500).send('Erreur lors du chargement de l\'image');
  }
});


// Partie Taha
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/
/* ////////////////////////////////////////////////////////////////////////////////////////////*/


const fetchUsers = async () => {
  try {
    const users = await User.find().lean();
    return users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

app.get("/predictions", async (req, res) => {
  try {
    const users = await fetchUsers();
    if (!users || users.length === 0) {
      return res.status(404).json({ error: "No user data found" });
    }

    const pythonProcess = spawn("python", [path.join(__dirname, "predict.py")]);
    let output = "";
    let errorOutput = "";

    pythonProcess.stdin.write(JSON.stringify(users));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on("close", (code) => {
      console.log("Python Exit Code:", code);
      console.log("Python Output:", output);
      console.log("Python Error Output:", errorOutput);
      if (code === 0) {
        try {
          const predictions = JSON.parse(output);
          res.json(predictions);
        } catch (parseError) {
          console.error("Parse error:", parseError);
          res.status(500).json({ error: "Failed to parse prediction output" });
        }
      } else {
        console.error("Python script error:", errorOutput);
        res.status(500).json({ error: "Prediction script failed", details: errorOutput });
      }
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

// Cleanup function
app.closeAll = async () => {
  try {
    await mongoose.connection.close();
    console.log("Mongoose connection closed");

    if (storage.client) {
      await storage.client.close();
      console.log("GridFsStorage client closed");
    } else if (storage.db) {
      await storage.db.close();
      console.log("GridFsStorage db closed");
    }

    // Remove these lines since transporter doesn't need to be closed
    // transporter.close();
    // console.log("Transporter from emailConfig closed");
    // transporterHoussine.close();
    // console.log("TransporterHoussine closed");
  } catch (err) {
    console.error("Error during cleanup:", err);
  }
};





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