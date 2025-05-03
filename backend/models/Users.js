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
  Password: { 
    type: String,
    required: function() {
      return !this.googleId; 
    }
  },
  googleId: { type: String, unique: true, sparse: true },
  Classe: { type: String },
  Role: {
    type: [String],
    enum: ['student', 'admin', 'psychiatre', 'teacher'],
    required: true
  }, 
  PhoneNumber: { type: String },
  imageUrl: { type: String },
  verified: { type: Boolean, default: false },
  inappropriateCommentsCount: { type: Number, default: 0 },
  lastInappropriateComment: { type: Date },
  enabled: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  twoFactorSecret: String,
  twoFactorSecretTemp: String,
  twoFactorEnabled: { type: Boolean, default: false },
  // Nouveau champ pour les enseignants
  enableExitRequestSorting: { type: Boolean, default: false }, // Ajouté  // champ ajouté pour la vérification de l'email
  badges: [{
    name: { type: String, required: true }, // Nom du badge (ex: "Écoute active")
    description: { type: String }, // Description du badge
    awardedAt: { type: Date, default: Date.now } // Date d'attribution
  }]
}, {
  collection: 'users',
  timestamps: true,
  strict: false
});

// Create a method to handle inappropriate comment strikes baha
userSchema.methods.incrementInappropriateComments = async function() {
  this.inappropriateCommentsCount += 1;
  this.lastInappropriateComment = new Date();
  
  // Disable account after 3 strikes
  if (this.inappropriateCommentsCount >= 3) {
    this.enabled = false;
  }
  
  return this.save();
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);

