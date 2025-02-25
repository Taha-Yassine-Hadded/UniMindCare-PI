require('dotenv').config();
const createError = require('http-errors');
const path = require('path');
const logger = require('morgan');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const axios = require('axios');
const passport = require('./routes/passportConfig'); // Import the configured passport instance
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/usersRouter');

// Initialize Express app
const app = express();

app.use(cors());
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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

// Mount routes *AFTER* session and passport
app.use('/', indexRouter);
app.use('/users', usersRouter);

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
        redirect_uri: 'http://localhost:5000/auth/callback',
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token, id_token } = tokenResponse.data;

    // Use the access token to fetch user info
    const userInfoResponse = await axios.get(
      `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
      { headers: { Authorization: `Bearer ${access_token}` } }
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

// Logout Route
app.get('/logout', keycloak.protect(), (req, res) => {
  const idToken = req.session.id_token; // Retrieve the ID token from the session

  // Clear the session
  req.session.destroy((err) => {
    if (err) {
      console.error('Failed to destroy session:', err);
      return res.status(500).send('Logout failed.');
    }

    // Redirect to Keycloak's logout endpoint
    const keycloakLogoutUrl = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/logout?id_token_hint=${idToken}&post_logout_redirect_uri=http://localhost:5000`;
    res.redirect(keycloakLogoutUrl);
  });
});

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;