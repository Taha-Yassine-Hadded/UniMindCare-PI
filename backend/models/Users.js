const mongoose = require('mongoose');

const usersSchema = new mongoose.Schema({
  Name: String,
  Identifiant: { type: String, unique: true },
  Email: String,
  Password: String,
  Classe: String,
  Role: {
    type: [String],
    enum: ['student', 'admin', 'psychologist', 'teacher'],
    required: true
  }, 

  PhoneNumber: String,
  imageUrl: String
}, { timestamps: true });

module.exports =  mongoose.model('Users', usersSchema);
