
var express = require('express');
var router = express.Router();
const Users = require('../models/Users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const passport = require('./passportConfig');

const tokenBlacklist = new Set();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});



// Sign-in route
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  // Validate email format
  if (!email.endsWith('@esprit.tn')) {
    return res.status(400).json({ message: 'Email must be from the domain @esprit.tn' });
  }

  try {
    // Find user by email
    const user = await Users.findOne({ Email: email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.Email, roles: user.Role,identifiant: user.Identifiant },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Sign-in error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Google login route
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google login callback route
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }),
  async (req, res) => {
    // Successful authentication, generate a token and redirect home.
    const user = req.user;
    const token = jwt.sign(
      { userId: user._id, email: user.Email, roles: user.Role, identifiant: user.Identifiant },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.redirect(`http://localhost:3000/login?token=${token}`);
  }
);

// Logout route
router.post('/logout', (req, res) => {
  const token = req.headers.authorization.split(' ')[1]; // Extract token from Authorization header

  // Add the token to the blacklist
  tokenBlacklist.add(token);

  res.status(200).send('Logout successful.');
});

// Middleware to check if the token is blacklisted
function checkTokenBlacklist(req, res, next) {
  const token = req.headers.authorization.split(' ')[1];
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ message: 'Token is blacklisted' });
  }
  next();
}

// Apply the middleware to protected routes
router.use('/protected', checkTokenBlacklist, (req, res) => {
  res.send('This is a protected route');
});

module.exports = router;
