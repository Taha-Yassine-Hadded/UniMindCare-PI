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
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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

// Security middleware
app.use(helmet()); // Add HTTP security headers
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:'],
    connectSrc: ["'self'", 'http://localhost:3000'],
  },
}));

// Rate limiting for sensitive endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Trop de requêtes, réessayez plus tard',
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
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));
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
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true },
}));
app.use(passport.initialize());
app.use(passport.session());

// Utility functions
const sanitizeInput = (input) => validator.escape(validator.trim(input));
const validateEmail = (email) => /^[a-zA-Z0-9._%+-]+@esprit\.tn$/.test(email);
const validateAndFindUser = async (email, identifiant) => {
  const sanitizedEmail = sanitizeInput(email);
  if (!validator.isEmail(sanitizedEmail)) throw new Error('Email invalide');
  const query = identifiant ? { Identifiant: sanitizeInput(identifiant) } : { Email: new RegExp(`^${sanitizedEmail}$`, 'i') };
  const user = await User.findOne(query);
  if (!user) throw new Error('Utilisateur non trouvé');
  return user;
};
const sendEmail = async (to, subject, content, isHtml = false) => {
  const mailOptions = {
    from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    [isHtml ? 'html' : 'text']: content,
  };
  await transporter.sendMail(mailOptions);
};
const handleAsync = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error(`Erreur: ${error.message}`, error);
    res.status(
      error.message.includes('invalide') || error.message.includes('requis') ? 400 :
      error.message.includes('non trouvé') ? 404 :
      error.message.includes('Trop de requêtes') ? 429 : 500
    ).json({ message: error.message });
  }
};

// Socket.IO middleware
const onlineUsers = new Set();
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) throw new Error('Authentification requise');
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!decoded.identifiant) throw new Error('Token invalide');
    socket.user = decoded;
    next();
  } catch (error) {
    console.error('Socket.IO auth error:', error.message);
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
    if (validator.isAlphanumeric(identifiant)) socket.join(identifiant);
  });

  socket.on('sendMessage', handleAsync(async (messageData, callback) => {
    const senderUser = await validateAndFindUser(null, messageData.sender);
    const receiverUser = await validateAndFindUser(null, messageData.receiver);
    if (messageData.sender !== socket.user.identifiant) throw new Error('Non autorisé');

    const newMessage = new Message({
      sender: senderUser.Identifiant,
      receiver: receiverUser.Identifiant,
      message: sanitizeInput(messageData.message),
      type: messageData.type || 'text',
      fileName: messageData.fileName ? sanitizeInput(messageData.fileName) : undefined,
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
  }));

  socket.on('markAsRead', handleAsync(async ({ sender, receiver }) => {
    if (!validator.isAlphanumeric(sender) || !validator.isAlphanumeric(receiver)) throw new Error('Identifiants invalides');
    await Message.updateMany(
      {
        $or: [
          { sender, receiver, read: false },
          { sender: receiver, receiver: sender, read: false },
        ],
      },
      { $set: { read: true } }
    );
    const unreadCount = await Message.countDocuments({ receiver, read: false });
    io.to(receiver).emit('unreadCount', { sender, count: unreadCount });
  }));

  socket.on('startVideoCall', ({ to, from }) => {
    if (validator.isAlphanumeric(to) && validator.isAlphanumeric(from)) {
      io.to(to).emit('startVideoCall', { from });
    }
  });

  socket.on('offer', ({ offer, to, from }) => {
    if (validator.isAlphanumeric(to) && validator.isAlphanumeric(from)) {
      io.to(to).emit('offer', { offer, from });
    }
  });

  socket.on('answer', ({ answer, to, from }) => {
    if (validator.isAlphanumeric(to) && validator.isAlphanumeric(from)) {
      io.to(to).emit('answer', { answer, from });
    }
  });

  socket.on('ice-candidate', ({ candidate, to, from }) => {
    if (validator.isAlphanumeric(to) && validator.isAlphanumeric(from)) {
      io.to(to).emit('ice-candidate', { candidate, from });
    }
  });

  socket.on('endCall', ({ to }) => {
    if (to && validator.isAlphanumeric(to)) io.to(to).emit('endCall');
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
    filename: `${Date.now()}-${sanitizeInput(file.originalname)}`,
    bucketName: 'Uploads',
  }),
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Type de fichier non supporté'), false);
    }
    const buffer = file.buffer || Buffer.alloc(0);
    const isValidImage =
      (file.mimetype === 'image/jpeg' && buffer.slice(0, 3).toString('hex') === 'ffd8ff') ||
      (file.mimetype === 'image/png' && buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a') ||
      (file.mimetype === 'application/pdf' && buffer.slice(0, 4).toString('ascii') === '%PDF');
    if (!isValidImage) {
      return cb(new Error('Fichier invalide ou corrompu'), false);
    }
    cb(null, true);
  },
});

const storageLocal = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'Uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(sanitizeInput(file.originalname)));
  },
});
const uploadLocal = multer({
  storage: storageLocal,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'audio/webm', 'audio/mpeg'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Type de fichier non supporté'), false);
    }
    const buffer = file.buffer || Buffer.alloc(0);
    const isValidFile =
      (file.mimetype === 'image/jpeg' && buffer.slice(0, 3).toString('hex') === 'ffd8ff') ||
      (file.mimetype === 'image/png' && buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a') ||
      (file.mimetype === 'application/pdf' && buffer.slice(0, 4).toString('ascii') === '%PDF') ||
      (file.mimetype === 'audio/webm' && buffer.slice(0, 4).toString('hex').startsWith('1a45dfa3')) ||
      (file.mimetype === 'audio/mpeg' && buffer.slice(0, 2).toString('hex').startsWith('fff'));
    if (!isValidFile) {
      return cb(new Error('Fichier invalide ou corrompu'), false);
    }
    cb(null, true);
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
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
});

// File upload endpoint
app.post('/api/upload', authRateLimiter, uploadLocal.single('file'), handleAsync(async (req, res) => {
  if (!req.file) throw new Error('Aucun fichier sélectionné');
  const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  res.status(200).json({ fileUrl });
}));

// Meeting endpoint
app.post('/api/meeting', authRateLimiter, authMiddleware, handleAsync(async (req, res) => {
  const { meetLink, date, reason, duration } = req.body;
  if (!validator.isURL(meetLink) || !validator.isISO8601(date) || !validator.isLength(sanitizeInput(reason), { min: 1, max: 255 }) || !validator.isInt(duration.toString(), { min: 1 })) {
    throw new Error('Champs invalides');
  }

  const user = await validateAndFindUser(null, req.user.identifiant);
  const userRole = Array.isArray(req.user.Role) ? req.user.Role : [req.user.Role];
  if (!userRole.includes('teacher')) throw new Error('Seuls les enseignants peuvent planifier des réunions');

  const meeting = new Meeting({
    meetLink,
    date: new Date(date),
    reason: sanitizeInput(reason),
    duration: parseInt(duration),
    createdBy: req.user.identifiant,
  });
  await meeting.save();

  const users = await User.find({}, 'Email');
  await sendEmail(
    users.map(u => u.Email).join(','),
    'Nouvelle réunion planifiée',
    `Une nouvelle réunion a été planifiée.\n\nRaison: ${reason}\nLien: ${meetLink}\nDate: ${new Date(date).toLocaleString()}\nDurée: ${duration} minutes`
  );

  res.status(201).json({ message: 'Réunion planifiée avec succès', meeting });
}));

// Forgot password endpoint
app.post('/api/forgot-password', authRateLimiter, handleAsync(async (req, res) => {
  const { email } = req.body;
  const user = await validateAndFindUser(email);
  const otp = crypto.randomInt(1000, 9999).toString();
  user.otp = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  const mailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="background-color: #4a6fdc; color: white; padding: 20px; text-align: center;">UniMindCare</h1>
      <div style="padding: 20px; border: 1px solid #ddd;">
        <p>Bonjour ${sanitizeInput(user.Name || '')},</p>
        <p>Votre code de vérification : <strong style="font-size: 32px; color: #4a6fdc;">${otp}</strong></p>
        <p>Valable 10 minutes.</p>
        <p>Cordialement,<br>L'équipe UniMindCare</p>
      </div>
    </div>
  `;
  await sendEmail(email, 'Réinitialisation de mot de passe', mailHtml, true);
  res.status(200).json({ message: 'OTP envoyé par email' });
}));

// Verify OTP endpoint
app.post('/api/verify-otp', authRateLimiter, handleAsync(async (req, res) => {
  const { email, otp } = req.body;
  if (!validator.isEmail(email) || !validator.isNumeric(otp)) throw new Error('Email ou OTP invalide');
  const user = await validateAndFindUser(email);
  if (user.otp !== otp || user.otpExpires < Date.now()) throw new Error('OTP invalide ou expiré');
  res.status(200).json({ message: 'OTP valide' });
}));

// Reset password endpoint
app.post('/api/reset-password', authRateLimiter, handleAsync(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!validator.isEmail(email) || !validator.isNumeric(otp) || !validator.isLength(newPassword, { min: 6 })) {
    throw new Error('Entrées invalides');
  }
  const user = await validateAndFindUser(email);
  if (user.otp !== otp || user.otpExpires < Date.now()) throw new Error('OTP invalide ou expiré');
  user.Password = await bcrypt.hash(newPassword, 10);
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();
  res.status(200).json({ message: 'Mot de passe réinitialisé avec succès' });
}));

// Register endpoint
app.post('/register', authRateLimiter, upload.single('imageFile'), handleAsync(async (req, res) => {
  const { Name, Identifiant, Email, Password, Classe, Role, PhoneNumber } = req.body;
  if (
    !validator.isAlphanumeric(Identifiant) ||
    !validator.isEmail(Email) ||
    !validator.isLength(Password, { min: 6 }) ||
    !validator.isLength(sanitizeInput(Name), { min: 1 }) ||
    !['student', 'teacher', 'psychiatre'].includes(Role)
  ) {
    throw new Error('Entrées invalides');
  }
  if (!validateEmail(Email)) throw new Error('L\'email doit être au format @esprit.tn');

  const existingUser = await User.findOne({ $or: [{ Identifiant: sanitizeInput(Identifiant) }, { Email: new RegExp(`^${sanitizeInput(Email)}$`, 'i') }] });
  if (existingUser) throw new Error('Identifiant ou Email déjà utilisé');

  const hashedPassword = await bcrypt.hash(Password, 10);
  const imageUrl = req.file ? req.file.filename : '';

  const newUser = new User({
    Name: sanitizeInput(Name),
    Identifiant: sanitizeInput(Identifiant),
    Email,
    Password: hashedPassword,
    Classe: Role === 'student' ? sanitizeInput(Classe) : '',
    Role,
    PhoneNumber: validator.isMobilePhone(PhoneNumber) ? sanitizeInput(PhoneNumber) : undefined,
    imageUrl,
    verified: false,
  });
  const savedUser = await newUser.save();

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await new UserVerification({ userId: savedUser._id, code: verificationCode, expiresAt }).save();

  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="background-color: #4a6fdc; color: white; padding: 20px; text-align: center;">UniMindCare</h1>
      <div style="padding: 20px; border: 1px solid #ddd;">
        <h2>Bonjour ${sanitizeInput(savedUser.Name)},</h2>
        <p>Votre code de vérification : <strong style="font-size: 38px; color: #4a6fdc;">${verificationCode}</strong></p>
        <p>Ce code expirera dans 15 minutes.</p>
        <p>© ${new Date().getFullYear()} UniMindCare.</p>
      </div>
    </div>
  `;
  await sendEmail(savedUser.Email, 'Vérification de votre compte UniMindCare', htmlTemplate, true);
  res.status(201).json({ message: 'Utilisateur enregistré. Vérifiez votre email.' });
}));

// Verify email endpoint
app.post('/verify-email', authRateLimiter, handleAsync(async (req, res) => {
  const { email, code } = req.body;
  if (!validator.isEmail(email) || !validator.isNumeric(code)) throw new Error('Email ou code invalide');
  const user = await validateAndFindUser(email);
  const verificationRecord = await UserVerification.findOne({ userId: user._id, code });
  if (!verificationRecord || verificationRecord.expiresAt < new Date()) throw new Error('Code invalide ou expiré');
  await User.findByIdAndUpdate(user._id, { verified: true });
  await UserVerification.findByIdAndDelete(verificationRecord._id);
  res.status(200).json({ message: 'Compte vérifié avec succès' });
}));

// Register FaceID user
app.post('/api/registerUserFaceID', authRateLimiter, handleAsync(async (req, res) => {
  const { name, identifiant } = req.body;
  if (!validator.isLength(sanitizeInput(name), { min: 1 }) || !validator.isAlphanumeric(sanitizeInput(identifiant))) {
    throw new Error('Nom et identifiant requis');
  }
  await new FaceIDUser({ name: sanitizeInput(name), identifiant: sanitizeInput(identifiant) }).save();
  res.status(200).json({ message: 'Utilisateur enregistré avec succès' });
}));

// Sensor data endpoint
const DataSchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  date: String,
});
const Data = mongoose.model('Data', DataSchema);

app.post('/api/ajouter-donnees', handleAsync(async (req, res) => {
  const { temperature, humidity, date } = req.body;
  if (!validator.isFloat(temperature.toString()) || !validator.isFloat(humidity.toString()) || !validator.isISO8601(date)) {
    throw new Error('Données invalides');
  }
  await new Data({ temperature, humidity, date }).save();
  res.status(200).json({ message: 'Données ajoutées avec succès' });
}));

// Image endpoint
app.get('/image/:filename', handleAsync(async (req, res) => {
  const filename = sanitizeInput(req.params.filename);
  const file = await gfs.files.findOne({ filename });
  if (!file) throw new Error('Image non trouvée');
  const readstream = gfs.createReadStream(filename);
  readstream.pipe(res);
}));

// Messages endpoint
app.get('/messages/:userId1/:userId2', authMiddleware, handleAsync(async (req, res) => {
  const { userId1, userId2 } = req.params;
  if (!validator.isAlphanumeric(userId1) || !validator.isAlphanumeric(userId2)) throw new Error('Identifiants invalides');
  const messages = await Message.find({
    $or: [
      { sender: userId1, receiver: userId2 },
      { sender: userId2, receiver: userId1 },
    ],
  }).sort({ timestamp: 1 });
  res.json(messages.map(msg => ({ ...msg._doc, read: msg.read !== undefined ? msg.read : false })));
}));

// Last messages endpoint
app.get('/last-messages/:userId', authMiddleware, handleAsync(async (req, res) => {
  const { userId } = req.params;
  if (!validator.isAlphanumeric(userId)) throw new Error('Identifiant invalide');
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
      return { user: otherUser, lastMessage: conv.lastMessage, timestamp: conv.timestamp };
    })
  );
  res.json(lastMessages);
}));

// Predictions endpoint
app.get('/predictions', handleAsync(async (req, res) => {
  const users = await User.find().lean();
  if (!users.length) throw new Error('Aucun utilisateur trouvé');
  const formattedUsers = users.map(user => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
  }));

  // Validate script path
  const scriptPath = path.join(__dirname, 'predict.py');
  if (!scriptPath.startsWith(__dirname)) throw new Error('Chemin de script invalide');

  const pythonProcess = spawn('python', [scriptPath]);
  let output = '';
  let errorOutput = '';

  pythonProcess.stdin.write(JSON.stringify(formattedUsers));
  pythonProcess.stdin.end();

  pythonProcess.stdout.on('data', data => { output += data.toString(); });
  pythonProcess.stderr.on('data', data => { errorOutput += data.toString(); });
  pythonProcess.on('close', code => {
    if (code === 0) {
      try {
        const predictions = JSON.parse(output);
        res.json(predictions);
      } catch (parseError) {
        throw new Error('Erreur de parsing des prédictions');
      }
    } else {
      throw new Error(`Échec du script de prédiction: ${errorOutput}`);
    }
  });
}));

// Cleanup function
app.closeAll = async () => {
  try {
    await mongoose.connection.close();
    console.log('Mongoose connection closed');
    if (storage.client) await storage.client.close();
    else if (storage.db) await storage.db.close();
    console.log('GridFsStorage closed');
  } catch (err) {
    console.error('Erreur lors du nettoyage:', err);
  }
};

// Error handler
app.use((req, res, next) => next(createError(404)));
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500).render('error');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

initScheduler();

module.exports = { app, server };