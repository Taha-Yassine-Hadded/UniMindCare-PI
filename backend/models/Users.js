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
  Password: { type: String, required: true },
  Classe: { type: String },
  Role: { type: String },
  PhoneNumber: { type: String },
  imageUrl: { type: String },
  otp: { type: String },
  otpExpires: { type: Date }
}, { 
  collection: 'users',
  timestamps: true,
  strict: false
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);