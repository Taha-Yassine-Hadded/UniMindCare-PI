require('dotenv').config();
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

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

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

// Define User Schema
const UserSchema = new mongoose.Schema({
  keycloakId: String,
  username: String,
  email: String,
  roles: [String],
});
const User = mongoose.model('User', UserSchema);

// Session configuration (required for Keycloak)
const memoryStore = new session.MemoryStore();
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'super-secret-key',
    resave: false,
    saveUninitialized: true,
    store: memoryStore,
  })
);

// Keycloak setup
const keycloakConfig = {
  clientId: process.env.KEYCLOAK_CLIENT_ID,
  bearerOnly: false, // Set to false to allow redirects to Keycloak login
  serverUrl: process.env.KEYCLOAK_URL,
  realm: process.env.KEYCLOAK_REALM,
  credentials: { secret: process.env.KEYCLOAK_CLIENT_SECRET },
};
const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);
app.use(keycloak.middleware());

// Route to handle Keycloak callback and exchange authorization code for tokens
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code is missing.');
  }

  try {
    // Exchange the authorization code for an access token
    const tokenResponse = await axios.post(
      `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KEYCLOAK_CLIENT_ID,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
        code: code,
        redirect_uri: 'http://localhost:5000/auth/callback', // Must match the redirect URI in Keycloak
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, id_token } = tokenResponse.data;

    // Use the access token to fetch user info
    const userInfoResponse = await axios.get(
      `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const userInfo = userInfoResponse.data;

    // Check if User Exists in MongoDB
    let existingUser = await User.findOne({ keycloakId: userInfo.sub });

    if (!existingUser) {
      existingUser = new User({
        keycloakId: userInfo.sub,
        username: userInfo.preferred_username,
        email: userInfo.email,
        roles: userInfo.realm_access?.roles || [],
      });
      await existingUser.save();
      console.log('User Synced to MongoDB:', existingUser);
    }

    // Store tokens in session (optional)
    req.session.access_token = access_token;
    req.session.id_token = id_token;

    // Redirect to a protected route or dashboard
    res.redirect('/protected');
  } catch (error) {
    console.error('Token exchange or user info fetch failed:', error.response?.data || error.message);
    res.status(500).send('Authentication failed.');
  }
});

// Protected Route (Sync User from Keycloak to MongoDB)
app.get('/protected', keycloak.protect(), async (req, res) => {
  const user = req.kauth.grant.access_token.content;

  // Check if User Exists in MongoDB
  let existingUser = await User.findOne({ keycloakId: user.sub });

  if (!existingUser) {
    existingUser = new User({
      keycloakId: user.sub,
      username: user.preferred_username,
      email: user.email,
      roles: user.realm_access?.roles || [],
    });
    await existingUser.save();
    console.log('User Synced to MongoDB:', existingUser);
  }

  res.json({ message: 'Access Granted', user: existingUser });
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