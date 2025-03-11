const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  Name: { type: String },
  Identifiant: { type: String, unique: true },
  Email: {
    type: String,
    unique: true,
    required: true,
    validate: {
      validator: function(value) {
        return value.toLowerCase().endsWith('@esprit.tn');
      },
      message: 'L\'email doit se terminer par "@esprit.tn"'
    }
  },
  //Password: { type: String, required: true },
  Password: { 
    type: String,
    required: function() {
      // Requis seulement si pas d'authentification Google
      return !this.googleId; 
    }
  },
  googleId: { type: String, unique: true, sparse: true }, // Ajouter ce champ
  Classe: { type: String },
  Role: {
    type: [String],
    enum: ['student', 'admin', 'psychologist', 'teacher'],
    required: true
  }, 
  PhoneNumber: { type: String },
  imageUrl: { type: String },
  verified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  twoFactorSecret: String,        // Secret 2FA permanent
    twoFactorSecretTemp: String,    // Secret temporaire avant activation
    twoFactorEnabled: { type: Boolean, default: false } // Statut 2FA
}, { 
  collection: 'users',
  timestamps: true,
  strict: false
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);