const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Users = require('../Models/Users');
const { v4: uuidv4 } = require('uuid'); // Import UUID library to generate unique identifiers

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:5000/users/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if a user with the same email already exists
    let user = await Users.findOne({ Email: profile.emails[0].value });

    if (user) {
      // If user exists but doesn't have a googleId, update their record
      if (!user.googleId) {
        user.googleId = profile.id;
        await user.save();
      }
    } else {
      // If user does not exist, create a new one
      user = new Users({
        Name: profile.displayName,
        Email: profile.emails[0].value,
        googleId: profile.id,
        Identifiant: uuidv4(), // Generate a unique identifier
        Role: ['student'] // Default role
      });
      await user.save();
    }

    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await Users.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;