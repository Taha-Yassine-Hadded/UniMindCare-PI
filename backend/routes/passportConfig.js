const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Users = require('../models/Users');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:5000/users/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;

    // Validation spécifique pour ESPRIT
    if (!email.toLowerCase().endsWith('@esprit.tn')) {
      return done(new Error('Seuls les emails @esprit.tn sont autorisés'));
    }

    let user = await Users.findOne({ 
      $or: [
        { Email: email },
        { googleId: profile.id }
      ]
    });

    if (!user) {
      user = new Users({
        Name: profile.displayName,
        Email: email,
        googleId: profile.id,
        imageUrl: '../public/default-profile.png', // Default profile picture
        verified: true // Mark as verified automatically
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