
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


    if (user?.googleId) {
      return res.status(400).json({ 
        message: 'Veuillez utiliser la connexion Google' 
      });
    }

    // Check if user is verified
    if (!user.verified) {
      return res.status(400).json({ message: 'Account not verified. Please verify your email.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.Email, roles: user.Role, identifiant: user.Identifiant },
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
// routes/users.js
// Google login callback route
router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const user = req.user;

      // Redirect to the frontend page for additional information
      res.redirect(`http://localhost:3000/tivo/authentication/register-bg-img?userId=${user._id}`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect('/login?error=google_auth_failed');
    }
  }
);

// Route to handle additional user information
router.post('/complete-registration', async (req, res) => {
  const { userId, identifiant, classe, role, phoneNumber } = req.body;

  try {
    // Find the user by ID
    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Update user information
    user.Identifiant = identifiant;
    user.Classe = classe;
    user.Role = role;
    user.PhoneNumber = phoneNumber;

    await user.save();

    // Generate a JWT for the user
    const token = jwt.sign(
      { userId: user._id, email: user.Email, roles: user.Role, identifiant: user.Identifiant },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token });
  } catch (error) {
    console.error('Complete registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
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
