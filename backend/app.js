require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Modules externes
const createError = require('http-errors');
const path = require('path');
const logger = require('morgan');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('./routes/passportConfig');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const bodyParser = require('body-parser');



// Modules internes
const transporter = require('./config/emailConfig');
const FaceIDUser = require('./faceIDUser');
const UserVerification = require('./models/UserVerification');
const User = require('./models/Users');

// Routes
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/usersRouter');
const usersStatisticsRoutes = require('./routes/usersStatistics');
const usersRoutesHoussine = require('./routes/usersHoussine');
const evaluationRoutes = require('./routes/evalution');
const questionnaireRoutes = require('./routes/Response');

// Initialisation de l'application Express
const app = express();

// Configuration de MongoDB
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/Pi-2025')
  .then(() => console.log('Connecté à MongoDB'))
  .catch((err) => {
    console.error('Erreur de connexion MongoDB:', err);
    process.exit(1);
  });

// Configuration de GridFS
let gfs;
const conn = mongoose.connection;
conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
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

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Configuration de la session
const memoryStore = new session.MemoryStore();
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
}));

// Initialisation de Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes principales
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/usersStat', usersStatisticsRoutes);
app.use('/api/users', usersRoutesHoussine);
app.use('/api/evalutions', evaluationRoutes);
app.use('/api/questionnaire', questionnaireRoutes);

// Validation de l'email
const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@esprit\.tn$/;
  return emailRegex.test(email);
};

// Configuration du transporteur d'email alternatif (Houssine)
const transporterHoussine = nodemailer.createTransport({
  service: 'gmail',
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

// Route d'inscription
app.post('/register', upload.single('imageFile'), async (req, res) => {
  const { Name, Identifiant, Email, Password, Classe, Role, PhoneNumber } = req.body;
  const validRoles = ['student', 'teacher', 'psychiatre'];

  if (!validRoles.includes(Role)) {
    return res.status(400).send('Rôle invalide.');
  }
  if (!validateEmail(Email)) {
    return res.status(400).send('L\'email doit être au format @esprit.tn');
  }

  const existingUser = await User.findOne({ $or: [{ Identifiant }, { Email }] });
  if (existingUser) {
    return res.status(400).send('Identifiant ou Email déjà utilisé');
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

  try {
    const savedUser = await newUser.save();
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    const newVerification = new UserVerification({
      userId: savedUser._id,
      token: verificationToken,
      expiresAt,
    });
    await newVerification.save();

    const verificationLink = `http://localhost:5000/verify-email/${verificationToken}`;
    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: savedUser.Email,
      subject: 'Vérification de votre compte',
      html: `<p>Cliquez sur ce lien pour vérifier votre compte :</p><a href="${verificationLink}">Vérifier mon compte</a>`,
    };

    await transporter.sendMail(mailOptions);
    res.status(201).send('Utilisateur enregistré avec succès. Vérifiez votre email.');
  } catch (err) {
    console.error('Erreur lors de l\'enregistrement:', err);
    res.status(500).send('Erreur lors de l\'enregistrement');
  }
});

// Route de vérification d'email
app.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const verificationRecord = await UserVerification.findOne({ token });

    if (!verificationRecord || verificationRecord.expiresAt < new Date()) {
      return res.status(400).send('Lien de vérification invalide ou expiré.');
    }

    await User.findByIdAndUpdate(verificationRecord.userId, { verified: true });
    await UserVerification.deleteOne({ _id: verificationRecord._id });
    res.send('Votre compte a été vérifié avec succès !');
  } catch (err) {
    console.error('Erreur lors de la vérification:', err);
    res.status(500).send('Erreur serveur.');
  }
});

// Route pour récupérer une image
app.get('/image/:filename', async (req, res) => {
  try {
    const file = await gfs.files.findOne({ filename: req.params.filename });
    if (!file) {
      return res.status(404).send('Image non trouvée');
    }
    const readstream = gfs.createReadStream(file.filename);
    readstream.pipe(res);
  } catch (err) {
    res.status(500).send('Erreur lors du chargement de l\'image');
  }
});

// Routes de réinitialisation de mot de passe
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ Email: new RegExp(`^${email}$`, 'i') });
    if (!user) return res.status(404).send('Utilisateur non trouvé');

    const otp = crypto.randomInt(1000, 9999).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Réinitialisation de mot de passe',
      text: `Votre code OTP est : ${otp}. Il expirera dans 10 minutes.`,
    };

    transporterHoussine.sendMail(mailOptions, (error) => {
      if (error) return res.status(500).send('Erreur lors de l\'envoi de l\'email');
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
    const user = await User.findOne({ Email: new RegExp(`^${email}$`, 'i') });
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
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
    const user = await User.findOne({ Email: new RegExp(`^${email}$`, 'i') });
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).send('OTP invalide ou expiré');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.Password = hashedPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    res.status(200).send('Mot de passe réinitialisé avec succès');
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).send('Erreur serveur');
  }
});

// Routes FaceID
app.post('/api/registerUserFaceID', async (req, res) => {
  const { name, identifiant } = req.body;
  if (!name || !identifiant) return res.status(400).json({ error: 'Nom et identifiant requis' });
  try {
    const newUser = new FaceIDUser({ name, identifiant });
    await newUser.save();
    res.status(200).json({ message: 'Utilisateur enregistré avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de l\'utilisateur' });
  }
});

// Routes de détection
app.post('/run-detection', (req, res) => {
  console.log('Endpoint run-detection atteint');
  res.json({ message: 'Détection démarrée' });
});

app.post('/stop-detection', (req, res) => {
  res.json({ message: 'Détection arrêtée' });
});

// Schéma et route pour les données (ex. météo)
const DataSchema = new mongoose.Schema({
  temperature: Number,
  humidity: Number,
  date: String,
});
const Data = mongoose.model('Data', DataSchema);

app.post('/api/ajouter-donnees', (req, res) => {
  const { temperature, humidity, date } = req.body;
  const newData = new Data({ temperature, humidity, date });
  newData.save()
    .then(() => res.status(200).json({ message: 'Données ajoutées avec succès' }))
    .catch(err => res.status(500).json({ message: 'Erreur interne du serveur' }));
});

// Gestion des erreurs
app.use((req, res, next) => {
  next(createError(404));
});

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  console.error(err);
  res.status(err.status || 500);
  res.render('error');
});

// Démarrage du serveur
app.listen(5000, () => {
  console.log('Serveur sur http://localhost:5000');
});

module.exports = app;