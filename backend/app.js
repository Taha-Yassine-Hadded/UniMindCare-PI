require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Attention : À éviter en production pour des raisons de sécurité

// Dépendances principales
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bodyParser = require('body-parser');
const createError = require('http-errors');
const path = require('path');
const jwt = require('jsonwebtoken');

// Dépendances pour la gestion des utilisateurs et emails
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Dépendances pour le stockage de fichiers
const multer = require('multer');
const Grid = require('gridfs-stream');
const { GridFsStorage } = require('multer-gridfs-storage');

// Modèles Mongoose
const User = require('./Models/Users');
const Message = require('./Models/message');
const UserVerification = require('./Models/UserVerification');
const FaceIDUser = require('./faceIDUser');

// Routes
const indexRouter = require('./routes/index');
const usersRoutes = require('./routes/users');
const usersRoutesHoussine = require('./routes/usersHoussine');
const usersRouter = require('./routes/usersRouter');
const postsRouter = require('./routes/posts');
const evaluationRoutes = require('./routes/evalution');
const crisisRoutes = require('./routes/crisisData');
const weatherRoutes = require('./routes/weather');
const feedbackRoutes = require('./routes/feedbackRoutes');
const exitRequestRoutes = require('./routes/exitRequests');
const questionnaireRoutes = require('./routes/Response');
const usersStatisticsRoutes = require('./routes/usersStatistics');
const authMiddleware = require('./middleware/auth'); // Auth middleware pour les routes sécurisées

// Utilitaires et middlewares
const { transporter } = require('./config/emailConfig');
const { initScheduler } = require('./utils/scheduler');
const passport = require('./routes/passportConfig');
const { spawn } = require('child_process');

// Initialisation de l'application et du serveur
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Connexion à MongoDB
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost/Pi-2025', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connexion à MongoDB réussie'))
  .catch((err) => console.error('Erreur de connexion à MongoDB:', err));

// Middleware Socket.IO pour authentification
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    console.log('Socket.IO - Token reçu:', token);
    if (!token) return next(new Error('Authentification requise'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Socket.IO - Token décodé:', decoded);
    socket.user = decoded; // decoded contient "identifiant"
    next();
  } catch (error) {
    console.error('Socket.IO - Erreur authentification:', error.message);
    next(new Error('Token invalide'));
  }
});

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
  console.log(`Utilisateur connecté : ${socket.id} (Identifiant: ${socket.user?.identifiant || 'inconnu'})`);

  socket.on('join', (identifiant) => {
    socket.join(identifiant);
    console.log(`Utilisateur ${socket.user?.identifiant} a rejoint la salle ${identifiant}`);
  });

  socket.on('sendMessage', async ({ sender, receiver, message }, callback) => {
    try {
      const senderUser = await User.findOne({ Identifiant: sender });
      const receiverUser = await User.findOne({ Identifiant: receiver });
      if (!senderUser || !receiverUser) {
        return callback({ error: 'Utilisateur ou destinataire introuvable' });
      }
      console.log('Socket.IO - Comparaison:', { sender, socketIdentifiant: socket.user.identifiant });
      if (sender !== socket.user.identifiant) {
        return callback({ error: 'Non autorisé' });
      }
  
      const newMessage = new Message({
        sender: senderUser.Identifiant,
        receiver: receiverUser.Identifiant,
        message,
        timestamp: new Date(),
      });
      await newMessage.save();
  
      io.to(receiver).emit('receiveMessage', newMessage);
      io.to(sender).emit('receiveMessage', newMessage);
      callback({ success: true });
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message :', error);
      callback({ error: 'Erreur lors de l\'envoi du message' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Utilisateur déconnecté : ${socket.id}`);
  });
});

// Middlewares Express
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Configuration des vues
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Configuration de la session
const memoryStore = new session.MemoryStore();
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: true,
    store: memoryStore,
  })
);

// Initialisation de Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes principales
app.use('/', indexRouter);
app.use('/api/users', usersRoutesHoussine);
app.use('/users', usersRouter);
app.use('/api/posts', postsRouter);
app.use('/api/crisis', crisisRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/questionnaire', questionnaireRoutes);
app.use('/api/usersStat', usersStatisticsRoutes);
app.use('/api', feedbackRoutes);
app.use('/api', evaluationRoutes);
app.use('/api', exitRequestRoutes);
app.use('/api/auth', authMiddleware);

// Endpoint pour l'historique des messages
app.get('/messages/:userId1/:userId2', authMiddleware, async (req, res) => {
  const { userId1, userId2 } = req.params; // userId1 et userId2 sont des Identifiants (ex: "233AFT08946")
  try {
    const messages = await Message.find({
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 },
      ],
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages :', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des messages' });
  }
});

// Configuration Nodemailer
const transporterHoussine = nodemailer.createTransport({
  service: 'gmail',
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

// Routes pour la réinitialisation du mot de passe
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ Email: new RegExp(`^${email}$`, 'i') });
    if (!user) return res.status(404).send('Utilisateur non trouvé');

    const otp = crypto.randomInt(1000, 9999).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const mailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #4a6fdc; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .logo { max-width: 150px; margin-bottom: 10px; }
          .content { padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          .otp-code { font-size: 32px; font-weight: bold; color: #4a6fdc; text-align: center; padding: 15px; background-color: #f9f9f9; border-radius: 5px; margin: 20px 0; letter-spacing: 5px; }
          .info-box { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 3px solid #4a6fdc; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="http://localhost:5000/images/logo2.png" alt="UniMindCare Logo" class="logo">
          <h1>UniMindCare</h1>
          <p>Réinitialisation de mot de passe</p>
        </div>
        <div class="content">
          <p>Bonjour${user.Name ? ' ' + user.Name : ''},</p>
          <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte UniMindCare.</p>
          <p>Voici votre code de vérification :</p>
          <div class="otp-code">${otp}</div>
          <div class="info-box">
            <p><strong>Important :</strong> Ce code est valable pendant 10 minutes. Si vous n'avez pas demandé de réinitialisation, ignorez cet email.</p>
          </div>
          <p>Si vous avez des difficultés, contactez notre support.</p>
          <p>Cordialement,<br>L'équipe UniMindCare</p>
        </div>
        <div class="footer">
          <p>Message automatique. Ne pas répondre.</p>
          <p>UniMindCare © 2025 - Tous droits réservés</p>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Réinitialisation de mot de passe',
      html: mailHtml,
    };

    transporterHoussine.sendMail(mailOptions, (error) => {
      if (error) {
        console.error('Erreur email:', error);
        return res.status(500).send('Erreur lors de l\'envoi de l\'email');
      }
      res.status(200).send('OTP envoyé par email');
    });
  } catch (error) {
    console.error('Erreur serveur:', error);
    res.status(500).send('Erreur serveur');
  }
});

app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ Email: new RegExp(`^${email}$`, 'i') });
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).send('OTP invalide ou expiré');
    }
    res.status(200).send('OTP valide');
  } catch (error) {
    console.error('Erreur vérification OTP:', error);
    res.status(500).send('Erreur serveur');
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ Email: new RegExp(`^${email}$`, 'i') });
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).send('OTP invalide ou expiré');
    }
    user.Password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    res.status(200).send('Mot de passe réinitialisé avec succès');
  } catch (error) {
    console.error('Erreur réinitialisation mot de passe:', error);
    res.status(500).send('Erreur serveur');
  }
});

// Gestion des données ESP32
const DataSchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  date: String,
});
const Data = mongoose.model('Data', DataSchema);

app.post('/api/ajouter-donnees', async (req, res) => {
  const { temperature, humidity, date } = req.body;
  const newData = new Data({ temperature, humidity, date });
  try {
    await newData.save();
    res.status(200).json({ message: 'Données ajoutées avec succès' });
  } catch (err) {
    console.error('Erreur ajout données:', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// Enregistrement FaceID
app.post('/api/registerUserFaceID', async (req, res) => {
  const { name, identifiant } = req.body;
  if (!name || !identifiant) {
    return res.status(400).json({ error: 'Nom et identifiant requis' });
  }
  try {
    const newUser = new FaceIDUser({ name, identifiant });
    await newUser.save();
    res.status(200).json({ message: 'Utilisateur enregistré avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement' });
  }
});

// Gestion des utilisateurs (inscription et vérification)
const validateEmail = (email) => /^[a-zA-Z0-9._%+-]+@esprit\.tn$/.test(email);

let gfs;
mongoose.connection.once('open', () => {
  gfs = Grid(mongoose.connection.db, mongoose.mongo);
  gfs.collection('uploads');
  console.log('GridFS initialisé');
});

const storage = new GridFsStorage({
  url: process.env.MONGO_URI || 'mongodb://localhost/Pi-2025',
  file: (req, file) => ({
    filename: `${Date.now()}-${file.originalname}`,
    bucketName: 'uploads',
  }),
});
const upload = multer({ storage });

app.post('/register', upload.single('imageFile'), async (req, res) => {
  const { Name, Identifiant, Email, Password, Classe, Role, PhoneNumber } = req.body;
  const validRoles = ['student', 'teacher', 'psychiatre'];
  if (!validRoles.includes(Role)) return res.status(400).send('Rôle invalide');
  if (!validateEmail(Email)) return res.status(400).send('Email doit être @esprit.tn');

  const existingUser = await User.findOne({ $or: [{ Identifiant }, { Email }] });
  if (existingUser) return res.status(400).send('Identifiant ou Email déjà utilisé');

  const hashedPassword = await bcrypt.hash(Password, 10);
  const imageUrl = req.file ? req.file.filename : '';

  const newUser = new User({
    Name,
    Identifiant,
    Email,
    Password: hashedPassword,
    Classe: Role === 'student' ? Classe : '',
    Role,
    PhoneNumber,
    imageUrl,
    verified: false,
  });

  try {
    const savedUser = await newUser.save();
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const newVerification = new UserVerification({
      userId: savedUser._id,
      code: verificationCode,
      expiresAt,
    });
    await newVerification.save();

    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: savedUser.Email,
      subject: 'Vérification de votre compte',
      html: `<p>Votre code de vérification est : ${verificationCode}</p>`,
    };
    await transporter.sendMail(mailOptions);
    res.status(201).send('Utilisateur enregistré. Vérifiez votre email.');
  } catch (err) {
    console.error('Erreur enregistrement:', err);
    res.status(500).send('Erreur lors de l\'enregistrement');
  }
});

app.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).send('Email et code requis');

    const user = await User.findOne({ Email: new RegExp(`^${email}$`, 'i') });
    if (!user) return res.status(400).send('Utilisateur non trouvé');

    const verificationRecord = await UserVerification.findOne({ userId: user._id, code });
    if (!verificationRecord || verificationRecord.expiresAt < new Date()) {
      return res.status(400).send('Code invalide ou expiré');
    }

    await User.findByIdAndUpdate(user._id, { verified: true });
    await UserVerification.findByIdAndDelete(verificationRecord._id);
    res.status(200).send('Compte vérifié avec succès');
  } catch (err) {
    console.error('Erreur vérification:', err);
    res.status(500).send('Erreur lors de la vérification');
  }
});

app.get('/image/:filename', async (req, res) => {
  try {
    const file = await gfs.files.findOne({ filename: req.params.filename });
    if (!file) return res.status(404).send('Image non trouvée');
    const readstream = gfs.createReadStream(file.filename);
    readstream.pipe(res);
  } catch (err) {
    res.status(500).send('Erreur lors du chargement de l\'image');
  }
});

// Prédictions (Partie Taha)
const fetchUsers = async () => {
  const users = await User.find().lean();
  return users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
  }));
};

app.get('/predictions', async (req, res) => {
  try {
    const users = await fetchUsers();
    if (!users || users.length === 0) return res.status(404).json({ error: 'Aucune donnée utilisateur trouvée' });

    const pythonProcess = spawn('python', [path.join(__dirname, 'predict.py')]);
    let output = '';
    let errorOutput = '';

    pythonProcess.stdin.write(JSON.stringify(users));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => (output += data.toString()));
    pythonProcess.stderr.on('data', (data) => (errorOutput += data.toString()));

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const predictions = JSON.parse(output);
          res.json(predictions);
        } catch (parseError) {
          console.error('Erreur parsing:', parseError);
          res.status(500).json({ error: 'Échec parsing prédictions' });
        }
      } else {
        console.error('Erreur script Python:', errorOutput);
        res.status(500).json({ error: 'Échec script prédiction', details: errorOutput });
      }
    });
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ error: 'Échec récupération données utilisateurs' });
  }
});

// Initialisation du planificateur
initScheduler();

// Gestion des erreurs
app.use((req, res, next) => {
  next(createError(404));
});

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// Cleanup function
app.closeAll = async () => {
  try {
    await mongoose.connection.close();
    console.log('Connexion Mongoose fermée');
    if (storage.client) await storage.client.close();
    else if (storage.db) await storage.db.close();
    console.log('GridFsStorage fermé');
  } catch (err) {
    console.error('Erreur lors du cleanup:', err);
  }
};

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT} avec Socket.IO`));