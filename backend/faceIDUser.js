const mongoose = require("mongoose");

// Définition du modèle Mongoose pour l'utilisateur FaceID
const faceIDUserSchema = new mongoose.Schema({
  name: String,
  identifiant: String,
  createdAt: { type: Date, default: Date.now },
});

// Créer le modèle basé sur le schéma
const FaceIDUser = mongoose.model("FaceIDUser", faceIDUserSchema);

// Exporter le modèle
module.exports = FaceIDUser;
