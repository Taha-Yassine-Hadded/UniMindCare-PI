require('dotenv').config();
const createError = require('http-errors');
const path = require('path');
const logger = require('morgan');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const FaceIDUser = require('./faceIDUser');
const bodyParser = require('body-parser');
const UserVerification = require('./models/UserVerification');
const appointmentRoutes = require('./routes/appointmentRoutes');
const caseRoutes = require('./routes/caseRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const notificationsRoutes = require('./routes/notifications');
const notesRoutes = require('./routes/notesRoutes');
const jwt = require('jsonwebtoken');
const Message = require('./Models/message');
const User = require('./Models/Users');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const multer = require('multer');
const Grid = require('gridfs-stream');
const { GridFsStorage } = require('multer-gridfs-storage');
const { transporter } = require('./config/emailConfig');
const postsRouter = require('./routes/posts');
const { initScheduler } = require('./utils/scheduler');
const { spawn } = require('child_process');
const evaluationRoutes = require('./routes/evalution');
const crisisRoutes = require('./routes/crisisData');
const weatherRoutes = require('./routes/Weather');
const feedbackRoutes = require('./routes/feedbackRoutes');
const indexRouter = require('./routes/index');
const usersRoutes = require('./routes/users');
const passport = require('./routes/passportConfig');
const usersRouter = require('./routes/usersRouter');
const exitRequestRoutes = require('./routes/exitRequests');
const emotionStatsRoutes = require('./routes/emotionStats');
const authMiddleware = require('./middleware/auth');
const http = require('http');
const { Server } = require('socket.io');
const validator = require('validator');

// Validate environment variables
if (!process.env.JWT_SECRET || !process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.SESSION_SECRET || !process.env.MONGO_URI) {
  throw new Error('Missing required environment variables');
}

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Configure CORS
const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-faceid'],
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));
app.use(bodyParser.json());
app.use((req, res, next) => {
  req.io = io;
  next();
});

// View engine setup
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
const memoryStore = new session.MemoryStore();
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
}));
app.use(passport.initialize());
app.use(passport.session());

// Socket.IO middleware
const onlineUsers = new Set();
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentification requise'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Token invalide'));
  }
});

io.on('connection', (socket) => {
  console.log(`Utilisateur connecté : ${socket.id}`);
  if (socket.user?.identifiant) {
    onlineUsers.add(socket.user.identifiant);
    io.emit('onlineUsers', Array.from(onlineUsers));
  }

  socket.on('join', (identifiant) => {
    socket.join(identifiant);
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
      callback({ error: 'Erreur lors de l\'envoi du message' });
    }
  });

  socket.on('markAsRead', async ({ sender, receiver }) => {
    try {
      await Message.updateMany(
        {
          $or: [
            { sender, receiver, read: false },
            { sender: receiver, receiver: sender, read: false },
          ],
        },
        { $set: { read: true } }
      );
      const unreadCount = await Message.countDocuments({
        receiver,
        read: false,
      });
      io.to(receiver).emit('unreadCount', { sender, count: unreadCount });
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
    if (to) io.to(to).emit('endCall');
  });

  socket.on('disconnect', () => {
    if (socket.user?.identifiant) {
      onlineUsers.delete(socket.user.identifiant);
      io.emit('onlineUsers', Array.from(onlineUsers));
    }
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connexion à MongoDB réussie');
    notesRoutes.initializeDefaultTemplates()
      .then(() => console.log('Templates par défaut initialisés'))
      .catch(err => console.error('Erreur lors de l\'initialisation des templates:', err));
  })
  .catch(err => console.error('Erreur de connexion à MongoDB:', err));

// GridFS setup
const conn = mongoose.connection;
let gfs;
conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('Uploads');
  console.log('GridFS initialisé');
});

// Multer for file uploads
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => ({
    filename: `${Date.now()}-${file.originalname}`,
    bucketName: 'Uploads',
  }),
});
const upload = multer({ storage });

const storageLocal = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'Uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const uploadLocal = multer({
  storage: storageLocal,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'audio/webm', 'audio/mpeg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté'), false);
    }
  },
});

// Meeting Schema
const MeetingSchema = new mongoose.Schema({
  meetLink: { type: String, required: true },
  date: { type: Date, required: true },
  reason: { type: String, required: true },
  duration: { type: Number, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Meeting = mongoose.model('Meeting', MeetingSchema);

// Routes
app.use('/', indexRouter);
app.use('/api/users', usersRoutes);
app.use('/users', usersRouter);
app.use('/api/posts', postsRouter);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/emotion-stats', emotionStatsRoutes);
app.use('/api/emergency', require('./routes/emergencyClaims'));
app.use('/api/crisis', crisisRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/questionnaire', require('./routes/Response'));
app.use('/api/usersStat', require('./routes/usersStatistics'));
app.use('/api/programs', require('./routes/TeacherTrainingRoutes/trainingProgram'));
app.use('/api/training-content', require('./routes/TeacherTrainingRoutes/trainingContentRoutes'));
app.use('/api/progress', require('./routes/TeacherTrainingRoutes/userProgress'));
app.use('/api/certificates', require('./routes/TeacherTrainingRoutes/certificateRoutes'));
app.use('/api', exitRequestRoutes);
app.use('/api', evaluationRoutes);
app.use('/api', feedbackRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/notes', notesRoutes.router);

// Email configuration
const transporterHoussine = nodemailer.createTransport({
  service: 'gmail',
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Validate email
const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@esprit\.tn$/;
  return emailRegex.test(email);
};

// File upload endpoint
app.post('/api/upload', uploadLocal.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Aucun fichier sélectionné' });
  }
  const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  res.status(200).json({ fileUrl });
});

// Meeting endpoint (refactored to reduce complexity)
app.post('/api/meeting', authMiddleware, async (req, res) => {
  try {
    const { meetLink, date, reason, duration } = req.body;
    if (!validator.isURL(meetLink) || !validator.isISO8601(date) || !validator.isLength(reason, { min: 1, max: 255 }) || !validator.isInt(duration, { min: 1 })) {
      return res.status(400).json({ message: 'Champs invalides' });
    }

    const user = await User.findOne({ Identifiant: req.user.identifiant });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const userRole = Array.isArray(req.user.Role) ? req.user.Role : [req.user.Role];
    if (!userRole.includes('teacher')) {
      return res.status(403).json({ message: 'Seuls les enseignants peuvent planifier des réunions' });
    }

    const meeting = new Meeting({
      meetLink,
      date: new Date(date),
      reason,
      duration: parseInt(duration),
      createdBy: req.user.identifiant,
    });
    await meeting.save();

    const users = await User.find({}, 'Email');
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: users.map(u => u.Email).join(','),
      subject: 'Nouvelle réunion planifiée',
      text: `Une nouvelle réunion a été planifiée.\n\nRaison: ${reason}\nLien: ${meetLink}\nDate: ${new Date(date).toLocaleString()}\nDurée: ${duration} minutes`,
    };
    transporter.sendMail(mailOptions); // Removed await as it's non-critical

    res.status(201).json({ message: 'Réunion planifiée avec succès', meeting });
  } catch (error) {
    console.error('Erreur lors de la planification de la réunion:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Forgot password endpoint
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Email invalide' });
    }

    const user = await User.findOne({ Email: new RegExp(`^${email}$`, 'i') });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const otp = crypto.randomInt(1000, 9999).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const mailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="background-color: #4a6fdc; color: white; padding: 20px; text-align: center;">UniMindCare</h1>
        <div style="padding: 20px; border: 1px solid #ddd;">
          <p>Bonjour ${user.Name || ''},</p>
          <p>Votre code de vérification : <strong style="font-size: 32px; color: #4a6fdc;">${otp}</strong></p>
          <p>Valable 10 minutes.</p>
          <p>Cordialement,<br>L'équipe UniMindCare</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Réinitialisation de mot de passe',
      html: mailHtml,
    };
    transporterHoussine.sendMail(mailOptions); // Removed await

    res.status(200).json({ message: 'OTP envoyé par email' });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'OTP:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Verify OTP endpoint
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!validator.isEmail(email) || !validator.isNumeric(otp)) {
      return res.status(400).json({ message: 'Email ou OTP invalide' });
    }

    const user = await User.findOne({ Email: new RegExp(`^${email}$`, 'i') });
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP invalide ou expiré' });
    }

    res.status(200).json({ message: 'OTP valide' });
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'OTP:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Reset password endpoint
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!validator.isEmail(email) || !validator.isNumeric(otp) || !validator.isLength(newPassword, { min: 6 })) {
      return res.status(400).json({ message: 'Entrées invalides' });
    }

    const user = await User.findOne({ Email: new RegExp(`^${email}$`, 'i') });
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP invalide ou expiré' });
    }

    user.Password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Register endpoint
app.post('/register', upload.single('imageFile'), async (req, res) => {
  try {
    const { Name, Identifiant, Email, Password, Classe, Role, PhoneNumber } = req.body;
    if (!validator.isAlphanumeric(Identifiant) || !validator.isEmail(Email) || !validator.isLength(Password, { min: 6 }) ||
        !validator.isLength(Name, { min: 1 }) || !['student', 'teacher', 'psychiatre'].includes(Role)) {
      return res.status(400).json({ message: 'Entrées invalides' });
    }
    if (!validateEmail(Email)) {
      return res.status(400).json({ message: 'L\'email doit être au format @esprit.tn' });
    }

    const existingUser = await User.findOne({ $or: [{ Identifiant }, { Email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Identifiant ou Email déjà utilisé' });
    }

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
    const savedUser = await newUser.save();

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const newVerification = new UserVerification({
      userId: savedUser._id,
      code: verificationCode,
      expiresAt,
    });
    await newVerification.save();

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="background-color: #4a6fdc; color: white; padding: 20px; text-align: center;">UniMindCare</h1>
        <div style="padding: 20px; border: 1px solid #ddd;">
          <h2>Bonjour ${savedUser.Name},</h2>
          <p>Votre code de vérification : <strong style="font-size: 38px; color: #4a6fdc;">${verificationCode}</strong></p>
          <p>Ce code expirera dans 15 minutes.</p>
          <p>© ${new Date().getFullYear()} UniMindCare.</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: savedUser.Email,
      subject: 'Vérification de votre compte UniMindCare',
      html: htmlTemplate,
    };
    transporter.sendMail(mailOptions); // Removed await

    res.status(201).json({ message: 'Utilisateur enregistré. Vérifiez votre email.' });
  } catch (err) {
    console.error('Erreur lors de l\'enregistrement:', err);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement' });
  }
});

// Verify email endpoint
app.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!validator.isEmail(email) || !validator.isNumeric(code)) {
      return res.status(400).json({ message: 'Email ou code invalide' });
    }

    const user = await User.findOne({ Email: new RegExp(`^${email}$`, 'i') });
    if (!user) {
      return res.status(400).json({ message: 'Utilisateur non trouvé' });
    }

    const verificationRecord = await UserVerification.findOne({ userId: user._id, code });
    if (!verificationRecord || verificationRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Code invalide ou expiré' });
    }

    await User.findByIdAndUpdate(user._id, { verified: true });
    await UserVerification.findByIdAndDelete(verificationRecord._id);

    res.status(200).json({ message: 'Compte vérifié avec succès' });
  } catch (err) {
    console.error('Erreur lors de la vérification:', err);
    res.status(500).json({ message: 'Erreur lors de la vérification' });
  }
});

// Register FaceID user
app.post('/api/registerUserFaceID', async (req, res) => {
  try {
    const { name, identifiant } = req.body;
    if (!validator.isLength(name, { min: 1 }) || !validator.isAlphanumeric(identifiant)) {
      return res.status(400).json({ message: 'Nom et identifiant requis' });
    }

    const newUser = new FaceIDUser({ name, identifiant });
    await newUser.save();
    res.status(200).json({ message: 'Utilisateur enregistré avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement' });
  }
});

// Sensor data endpoint
const DataSchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  date: String,
});
const Data = mongoose.model('Data', DataSchema);

app.post('/api/ajouter-donnees', async (req, res) => {
  try {
    const { temperature, humidity, date } = req.body;
    if (!validator.isFloat(temperature.toString()) || !validator.isFloat(humidity.toString()) || !validator.isISO8601(date)) {
      return res.status(400).json({ message: 'Données invalides' });
    }

    const newData = new Data({ temperature, humidity, date });
    await newData.save();
    res.status(200).json({ message: 'Données ajoutées avec succès' });
  } catch (err) {
    console.error('Erreur lors de l\'ajout des données:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Image endpoint
app.get('/image/:filename', async (req, res) => {
  try {
    const file = await gfs.files.findOne({ filename: req.params.filename });
    if (!file) {
      return res.status(404).json({ message: 'Image non trouvée' });
    }
    const readstream = gfs.createReadStream(file.filename);
    readstream.pipe(res);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors du chargement de l\'image' });
  }
});

// Messages endpoint
app.get('/messages/:userId1/:userId2', authMiddleware, async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    if (!validator.isAlphanumeric(userId1) || !validator.isAlphanumeric(userId2)) {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }

    const messages = await Message.find({
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 },
      ],
    }).sort({ timestamp: 1 });

    const messagesWithRead = messages.map(msg => ({
      ...msg._doc,
      read: msg.read !== undefined ? msg.read : false,
    }));

    res.json(messagesWithRead);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Last messages endpoint
app.get('/last-messages/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!validator.isAlphanumeric(userId)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }

    const conversations = await Message.aggregate([
      { $match: { $or: [{ sender: userId }, { receiver: userId }] } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: { $cond: [{ $eq: ['$sender', userId] }, '$receiver', '$sender'] },
          lastMessage: { $first: '$message' },
          timestamp: { $first: '$timestamp' },
        },
      },
    ]);

    const lastMessages = await Promise.all(
      conversations.map(async conv => {
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
    console.error('Erreur lors de la récupération des derniers messages:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Predictions endpoint
app.get('/predictions', async (req, res) => {
  try {
    const users = await User.find().lean();
    if (!users.length) {
      return res.status(404).json({ error: 'Aucun utilisateur trouvé' });
    }

    const formattedUsers = users.map(user => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
    }));

    const pythonProcess = spawn('python', [path.join(__dirname, 'predict.py')]);
    let output = '';
    let errorOutput = '';

    pythonProcess.stdin.write(JSON.stringify(formattedUsers));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', data => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', data => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', code => {
      if (code === 0) {
        try {
          const predictions = JSON.parse(output);
          res.json(predictions);
        } catch (parseError) {
          res.status(500).json({ error: 'Erreur de parsing des prédictions' });
        }
      } else {
        res.status(500).json({ error: 'Échec du script de prédiction', details: errorOutput });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// Cleanup function
app.closeAll = async () => {
  try {
    await mongoose.connection.close();
    console.log('Mongoose connection closed');
    if (storage.client) {
      await storage.client.close();
      console.log('GridFsStorage client closed');
    } else if (storage.db) {
      await storage.db.close();
      console.log('GridFsStorage db closed');
    }
  } catch (err) {
    console.error('Erreur lors du nettoyage:', err);
  }
};

// Error handler
app.use((req, res, next) => {
  next(createError(404));
});

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

initScheduler();

module.exports = { app, server };