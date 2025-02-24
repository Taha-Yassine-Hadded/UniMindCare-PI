// filepath: /C:/Users/ferie/OneDrive/Bureau/uni/UniMindCare-PI-main/backend/models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  is2FAEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: String,
  verified2FA: {
    type: Boolean,
    default: false,
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;