

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
const appointementRoutes = require('./routes/appointmentRoutes');
const caseRoutes = require('./routes/caseRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const notificationsRoutes = require('./routes/notifications');
const notesRoutes = require('./routes/notesRoutes');
const jwt = require('jsonwebtoken');
const Message = require('./Models/message');
// Modèle Meeting
const MeetingSchema = new mongoose.Schema({
  meetLink: { type: String, required: true },
  date: { type: Date, required: true },
  reason: { type: String, required: true },
  duration: { type: Number, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Meeting = mongoose.model('Meeting', MeetingSchema);
const User = require('./Models/Users');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');  // Ajouter bcrypt pour le hachage des mots de passe
const crypto = require('crypto');
const multer = require('multer');
const Grid = require('gridfs-stream');
const { GridFsStorage } = require('multer-gridfs-storage');
const { transporter } = require('./config/emailConfig');
const postsRouter = require('./routes/posts');
const { initScheduler } = require('./utils/scheduler');
const { spawn } = require("child_process");
const evaluationRoutes = require("./routes/evalution");
const crisisRoutes = require("./routes/crisisData"); // Nouvelle route
const weatherRoutes = require("./routes/Weather");
const feedbackRoutes = require("./routes/feedbackRoutes"); // Assurez-vous que le chemin est correct
// Servir les fichiers statiques depuis le dossier images
var indexRouter = require('./routes/index');
var usersRoutes = require('./routes/users');
const passport = require('./routes/passportConfig'); // Import the configured passport instance
const usersRouter = require('./routes/usersRouter');
const exitRequestRoutes = require('./routes/exitRequests'); // Chemin correct vers tes routes
const emotionStatsRoutes = require('./routes/emotionStats');
const authMiddleware = require('./middleware/auth');

const http = require('http'); // Ajout pour WebSocket
const { Server } = require('socket.io'); // Ajout de Socket.IO
// Initialize Express app
var app = express();

// Créer un serveur HTTP avec Express
const server = http.createServer(app);

// Initialiser Socket.IO
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Remplacez par l'URL de votre frontend
    methods: ['GET', 'POST'],
  },
});

// Configure CORS middleware with explicit options at the top
const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-faceid'],
  credentials: true,
};
app.use(cors(corsOptions));

// Explicitly handle CORS preflight requests
app.options('/api/upload', cors(corsOptions));
app.options('/api/users/me', cors(corsOptions));
app.options('/api/meeting', cors(corsOptions));

// Log requests to verify CORS middleware is applied
app.use((req, res, next) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  next();
});


app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(cors());
app.use(bodyParser.json());

// view engine setup
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use("/api", exitRequestRoutes);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware pour passer io à toutes les routes
app.use((req, res, next) => {
  req.io = io; // Ajouter io à l'objet req pour qu'il soit accessible dans les routes
  next();
});


// Middleware Socket.IO pour authentification
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    console.log('Socket.IO - Token reçu:', token);
    if (!token) return next(new Error('Authentification requise'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Socket.IO - Token décodé:', decoded);
    socket.user = decoded;
    next();
  } catch (error) {
    console.error('Socket.IO - Erreur authentification:', error.message);
    next(new Error('Token invalide'));
  }
});

// Add a Set to track online users
const onlineUsers = new Set();

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
  console.log(`Utilisateur connecté : ${socket.id} (Identifiant: ${socket.user?.identifiant || 'inconnu'})`);

  // Add user to onlineUsers when they connect
  if (socket.user?.identifiant) {
    onlineUsers.add(socket.user.identifiant);
    io.emit('onlineUsers', Array.from(onlineUsers));
  }

  socket.on('join', (identifiant) => {
    socket.join(identifiant);
    console.log(`Utilisateur ${socket.user?.identifiant} a rejoint la salle ${identifiant}`);
  });

  socket.on('sendMessage', async (messageData, callback) => {
    try {
      const senderUser = await User.findOne({ Identifiant: messageData.sender });
      const receiverUser = await User.findOne({ Identifiant: messageData.receiver });
      if (!senderUser || !receiverUser) {
        return callback({ error: 'Utilisateur ou destinataire introuvable' });
      }
      if (messageData.sender !== socket.user.identifiant) {
        return callback({ error: 'Non autorisé' });
      }

      const newMessage = new Message({
        sender: senderUser.Identifiant,
        receiver: receiverUser.Identifiant,
        message: messageData.message,
        type: messageData.type || 'text',
        fileName: messageData.fileName,
        timestamp: new Date(),
        read: false,
      });
      await newMessage.save();

      // Calculer le nombre de messages non lus pour le destinataire
      const unreadCount = await Message.countDocuments({
        receiver: receiverUser.Identifiant,
        sender: senderUser.Identifiant,
        read: false,
      });

      io.to(messageData.receiver).emit('receiveMessage', newMessage);
      io.to(messageData.receiver).emit('unreadCount', {
        sender: senderUser.Identifiant,
        count: unreadCount,
      });
      io.to(messageData.sender).emit('receiveMessage', newMessage);
      callback({ success: true });
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message :', error);
      callback({ error: 'Erreur lors de l\'envoi du message' });
    }
  });

  socket.on('markAsRead', async ({ sender, receiver }) => {
    try {
      console.log(`Marquage comme lu - Sender: ${sender}, Receiver: ${receiver}`); // Débogage
      const result = await Message.updateMany(
        {
          $or: [
            { sender, receiver, read: false },
            { sender: receiver, receiver: sender, read: false },
          ],
        },
        { $set: { read: true } }
      );
      console.log(`Messages marqués comme lus: ${result.modifiedCount}`); // Débogage
      const unreadCount = await Message.countDocuments({
        receiver: receiver, // Messages reçus par receiver
        read: false,
      });
      console.log(`Nombre de messages non lus mis à jour pour ${receiver}: ${unreadCount}`); // Débogage
      io.to(receiver).emit('unreadCount', {
        sender,
        count: unreadCount,
      });
    } catch (error) {
      console.error('Erreur lors du marquage des messages comme lus:', error);
    }
  });

  socket.on('startVideoCall', ({ to, from }) => {
    io.to(to).emit('startVideoCall', { from });
  });

  socket.on('offer', ({ offer, to, from }) => {
    io.to(to).emit('offer', { offer, from });
  });

  socket.on('answer', ({ answer, to, from }) => {
    io.to(to).emit('answer', { answer, from });
  });

  socket.on('ice-candidate', ({ candidate, to, from }) => {
    io.to(to).emit('ice-candidate', { candidate, from });
  });

  socket.on('endCall', ({ to }) => {
    if (to) {
      io.to(to).emit('endCall');
    }
  });

  socket.on('disconnect', () => {
    console.log(`Utilisateur déconnecté : ${socket.id}`);
    if (socket.user?.identifiant) {
      onlineUsers.delete(socket.user.identifiant);
      io.emit('onlineUsers', Array.from(onlineUsers));
    }
  });
});

// Gestion des connexions WebSocket
io.on('connection', (socket) => {
  console.log('Un utilisateur s\'est connecté via WebSocket:', socket.id);

  // Associer l'utilisateur à une salle basée sur son ID
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`Utilisateur ${userId} a rejoint sa salle`);
  });

  socket.on('disconnect', () => {
    console.log('Un utilisateur s\'est déconnecté:', socket.id);
  });
});

// Middleware pour passer io à toutes les routes
app.use((req, res, next) => {
  req.io = io; // Ajouter io à l'objet req pour qu'il soit accessible dans les routes
  next();
});

// Gestion des connexions WebSocket
io.on('connection', (socket) => {
  console.log('Un utilisateur s\'est connecté via WebSocket:', socket.id);

  // Associer l'utilisateur à une salle basée sur son ID
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`Utilisateur ${userId} a rejoint sa salle`);
  });

  socket.on('disconnect', () => {
    console.log('Un utilisateur s\'est déconnecté:', socket.id);
  });
});

app.use("/api/users", usersRoutes);

app.use('/api/posts', postsRouter);

// Dans ton fichier principal (ex: app.js ou server.js)
app.use('/uploads', express.static('uploads'));
app.use('/api/notifications', notificationsRoutes);

app.use("/api", (req, res, next) => {
  console.log("Requête reçue sur /api :", req.method, req.url);
  next();
}, evaluationRoutes);
app.use('/', indexRouter);

app.use('/api/crisis', crisisRoutes); // Nouvelle route pour la crise
app.use("/api", feedbackRoutes); // Monter les routes de feedback sous /api
// MongoDB connection
/*mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));*/

   // Connexion à MongoDB
   /*mongoose.connect('mongodb://localhost/Pi-2025', { useNewUrlParser: true, useUnifiedTopology: true })
     .then(() => console.log('Connexion à MongoDB réussie'))
     .catch(err => console.log('Erreur de connexion à MongoDB: ', err));*/
     mongoose.connect('mongodb://localhost/Pi-2025', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connexion à MongoDB réussie');
    
    // Initialiser les templates par défaut
    notesRoutes.initializeDefaultTemplates()
      .then(() => console.log('Templates par défaut initialisés avec succès'))
      .catch(err => console.error('Erreur lors de l\'initialisation des templates:', err));
  })
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
app.use('/api/emotion-stats', emotionStatsRoutes);

// Partie emergency
const emergencyClaimsRouter = require('./routes/emergencyClaims');
app.use('/api/emergency', emergencyClaimsRouter);

// Servir le dossier uploads pour les images d'urgence
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Partie Crise
const crisisDataRoutes = require('./routes/crisisData');


// Ajouter la route des données de crise
app.use('/api/crisis', crisisDataRoutes);



//Partie datas from arduino 



// Partie meteo
// Importer la route de météo
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

// Configure multer for file storage (for chat file uploads)
const storage1 = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});


const uploadLocal = multer({
  storage1: storage1,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'audio/webm', 'audio/mpeg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté'), false);
    }
  },
});

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// File upload endpoint for chat
app.post('/api/upload', uploadLocal.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Aucun fichier sélectionné' });
  }

  const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  res.status(200).json({ fileUrl });
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


// Route pour planifier une réunion
app.post('/api/meeting', authMiddleware, async (req, res) => {
  console.log('Request received: POST /api/meeting');
  console.log('req.user:', req.user);

  try {
    const user = await User.findOne({ Identifiant: req.user.identifiant });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const userRole = req.user.Role || (req.user.roles && req.user.roles.includes('teacher') ? 'teacher' : null);
    if (!userRole || userRole !== 'teacher') {
      return res.status(403).json({ message: 'Seuls les enseignants peuvent planifier des réunions' });
    }

    const { meetLink, date, reason, duration } = req.body;

    if (!meetLink || !date || !reason || !duration) {
      return res.status(400).json({ message: 'Tous les champs sont requis' });
    }

    const meeting = new Meeting({
      meetLink,
      date: new Date(date),
      reason,
      duration: parseInt(duration),
      createdBy: req.user.identifiant,
    });

    await meeting.save();
    console.log('Réunion enregistrée:', meeting);

    const users = await User.find({}, 'Email');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: users.map((u) => u.Email).join(', '),
      subject: 'Nouvelle réunion planifiée',
      text: `Une nouvelle réunion a été planifiée.\n\nRaison: ${reason}\nLien: ${meetLink}\nDate: ${new Date(date).toLocaleString()}\nDurée: ${duration} minutes`,
    };

    await transporter.sendMail(mailOptions);
    console.log('E-mails envoyés aux utilisateurs');

    res.status(201).json({ message: 'Réunion planifiée avec succès', meeting });
  } catch (error) {
    console.error('Erreur lors de la planification de la réunion:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Endpoint pour l'historique des messages
app.get('/messages/:userId1/:userId2', authMiddleware, async (req, res) => {
  const { userId1, userId2 } = req.params;
  try {
    const messages = await Message.find({
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 },
      ],
    }).sort({ timestamp: 1 });

    // Ajouter une valeur par défaut pour read si absent
    const messagesWithRead = messages.map((msg) => ({
      ...msg._doc,
      read: msg.read !== undefined ? msg.read : false,
    }));

    console.log('Messages envoyés au client:', messagesWithRead); // Débogage
    res.json(messagesWithRead);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages :', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des messages' });
  }
});


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

    // Template HTML moderne pour l'email de vérification
    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vérifiez votre compte UniMindCare</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Poppins', Arial, sans-serif; background-color: #f4f7fa;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 20px 0;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); border-radius: 10px; overflow: hidden;">
              <!-- Header -->
              <tr>
                <td align="center" bgcolor="#4a6fdc" style="padding: 30px 20px;">
                  <img src="http://localhost:5000/images/logo2.png" alt="UniMindCare Logo" width="120" style="display: block; margin-bottom: 15px;">
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Vérifiez votre compte</h1>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td bgcolor="#ffffff" style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; font-size: 22px; color: #333333;">Bonjour ${savedUser.Name},</h2>
                  <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: #555555;">
                    Merci de vous être inscrit sur UniMindCare. Pour terminer votre inscription, veuillez utiliser le code de vérification ci-dessous :
                  </p>
                  
                  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center; border-left: 5px solid #4a6fdc;">
                    <h2 style="margin: 0; font-size: 38px; letter-spacing: 5px; color: #4a6fdc; font-weight: 700;">${verificationCode}</h2>
                  </div>
                  
                  <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: #555555;">
                    Ce code expirera dans <strong>15 minutes</strong>. Si vous n'avez pas demandé ce code, vous pouvez ignorer cet e-mail.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td bgcolor="#f0f2f5" style="padding: 20px 30px; text-align: center;">
                  <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                    Ceci est un message automatique, merci de ne pas y répondre.
                  </p>
                  <p style="margin: 0; font-size: 14px; color: #666666;">
                    &copy; ${new Date().getFullYear()} UniMindCare. Tous droits réservés.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    // Envoyer l'email avec le nouveau template
    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: savedUser.Email,
      subject: 'Vérification de votre compte UniMindCare',
      text: `Votre code de vérification est : ${verificationCode}`,
      html: htmlTemplate
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
const programRoutes = require('./routes/TeacherTrainingRoutes/trainingProgram');
const contentRoutes = require('./routes/TeacherTrainingRoutes/trainingContentRoutes');
const progressRoutes = require('./routes/TeacherTrainingRoutes/userProgress');
const certificateRoutes = require('./routes/TeacherTrainingRoutes/certificateRoutes');


app.use('/api/programs', programRoutes);
app.use('/api/training-content', contentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/certificates', certificateRoutes);





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





// Derniers messages
app.get('/last-messages/:userId', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  try {
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', userId] },
              '$receiver',
              '$sender',
            ],
          },
          lastMessage: { $first: '$message' },
          timestamp: { $first: '$timestamp' },
        },
      },
    ]);

    const lastMessages = await Promise.all(
      conversations.map(async (conv) => {
        const otherUser = await User.findOne({ Identifiant: conv._id }, 'Name Email Identifiant');
        return {
          user: otherUser,
          lastMessage: conv.lastMessage,
          timestamp: conv.timestamp,
        };
      })
    );

    res.json(lastMessages);
  } catch (error) {
    console.error('Erreur lors de la récupération des derniers messages :', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des derniers messages' });
  }
});



/*Partie salma gestion appointements */


app.use('/api/appointments', appointementRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/notes', notesRoutes.router);




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

// Démarrer le serveur avec server.listen
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

// Exporter l'app et le serveur
module.exports = { app, server };