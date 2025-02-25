require('dotenv').config();
var createError = require('http-errors');
var path = require('path');
var logger = require('morgan');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');  // Ajouter bcrypt pour le hachage des mots de passe
const User = require('./Models/User'); // Assurez-vous que le modèle User est bien importé
const UserVerification = require('./Models/UserVerification'); 
const nodemailer = require('nodemailer');  // Ajouter Nodemailer
const multer = require('multer');
const Grid = require('gridfs-stream');
const { GridFsStorage } = require('multer-gridfs-storage');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const crypto = require('crypto');
const transporter = require('./config/emailConfig');


// Initialize Express app
var app = express();

app.use(cors());

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
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Expiration dans 1 heure

    const newVerification = new UserVerification({
      userId: savedUser._id,
      token: verificationToken,
      expiresAt
    });

    await newVerification.save();

    // Envoyer l'email
    const verificationLink = `http://localhost:5000/verify-email/${verificationToken}`;
    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: savedUser.Email,
      subject: 'Vérification de votre compte',
      text: `Cliquez sur ce lien pour vérifier votre compte : ${verificationLink}`,
      html: `<p>Cliquez sur ce lien pour vérifier votre compte :</p><a href="${verificationLink}">Vérifier mon compte</a>`
    };

    await transporter.sendMail(mailOptions);

    res.status(201).send('Utilisateur enregistré avec succès. Vérifiez votre email.');
  } catch (err) {
    console.error('Erreur lors de l\'enregistrement:', err);
    res.status(500).send('Erreur lors de l\'enregistrement');
  }
});

app.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const verificationRecord = await UserVerification.findOne({ token });

    if (!verificationRecord || verificationRecord.expiresAt < new Date()) {
      return res.status(400).send('Lien de vérification invalide ou expiré.');
    }

    // Vérifier l'utilisateur
    await User.findByIdAndUpdate(verificationRecord.userId, { verified: true });

    // Supprimer le token après vérification
    await UserVerification.deleteOne({ _id: verificationRecord._id });

    res.send('Votre compte a été vérifié avec succès !');
  } catch (err) {
    console.error('Erreur lors de la vérification:', err);
    res.status(500).send('Erreur serveur.');
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
