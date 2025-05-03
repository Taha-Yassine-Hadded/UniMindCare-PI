const mongoose = require('mongoose');

const crisisSchema = new mongoose.Schema({
  nom: { 
    type: String,
    required: true 
  },
  identifiant: { 
    type: String,
    required: true 
  },
  classe: { 
    type: String 
  },
  date: { 
    type: Date,
    default: Date.now 
  },
  zones_malades: [{ 
    zone_malade: String,
    intensite: { 
      type: Number, 
      min: 1, 
      max: 10 
    }
  }]
});

module.exports = mongoose.model('crisis', crisisSchema);