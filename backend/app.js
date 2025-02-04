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
  'realm': process.env.KEYCLOAK_REALM,
  'auth-server-url': process.env.KEYCLOAK_URI,
  'resource': process.env.KEYCLOAK_CLIENT_ID,
  'ssl-required': 'external',
  'confidential-port': 0,
  'public-client': true,
};
const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);
app.use(keycloak.middleware());


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;


