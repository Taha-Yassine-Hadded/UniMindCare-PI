require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken'); // Ajout de jwt qui manquait
const User = require('../Models/Users'); // Chemin correct vers le modèle User
const nodemailer = require('nodemailer');

// Middleware d'authentification simplifié (sans dépendance externe)
const authenticateToken = async (req, res, next) => {
  try {
    // Récupérer l'en-tête d'autorisation
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Token d'authentification requis" });
    }
    
    // Extraire le token
    const token = authHeader.split(' ')[1];
    
    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_clé_secrète_jwt');
    
    // Récupérer les infos utilisateur
    const user = await User.findOne({ Identifiant: decoded.identifiant });
    
    if (!user) {
      return res.status(401).json({ message: "Utilisateur non trouvé" });
    }
    
    // Attacher les infos utilisateur à la requête
    req.user = {
      identifiant: user.Identifiant,
      email: user.Email,
      name: user.Name,
      Role: user.Role
    };
    
    next();
  } catch (error) {
    console.error("Erreur d'authentification:", error);
    res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

// Configuration de multer pour le stockage des images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/emergency';
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const fileExtension = path.extname(file.originalname);
    cb(null, `emergency-${uniqueSuffix}${fileExtension}`);
  }
});

// Filtrer les fichiers pour n'accepter que les images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont acceptées'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite à 5MB
  }
});

// Créer un modèle mongoose pour les réclamations d'urgence
const EmergencyClaim = mongoose.model('EmergencyClaim', new mongoose.Schema({
  identifiant: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  location: String,
  coordinates: {
    lat: Number,
    lng: Number
  },
  symptoms: [{
    id: Number,
    name: String,
    severity: String,
    category: String
  }],
  imageUrl: String,
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'resolved', 'rejected'], 
    default: 'pending' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: Date,
  notes: String,
  notificationsSent: { 
    type: Boolean, 
    default: false 
  },
  handledBy: {
    userId: String,
    name: String,
    role: String,
    timestamp: Date
  }
}));

// Middleware pour extraire l'identifiant utilisateur du token JWT
const extractUserIdentifier = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_clé_secrète_jwt');
      req.userIdentifiant = decoded.identifiant;
    }
    next();
  } catch (err) {
    console.error("Erreur d'extraction d'identifiant:", err);
    next(); // Continuer même en cas d'erreur
  }
};

// Configurer le transporteur d'emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'votre_email@gmail.com',
    pass: process.env.EMAIL_PASS || 'votre_mot_de_passe'
  },
  tls: {
    rejectUnauthorized: false
  },
  debug: true
});

// Ajouter cette vérification après la configuration du transporteur
transporter.verify(function(error, success) {
  if (error) {
    console.error("Erreur de configuration du transporteur email pour les urgences:", error);
  } else {
    console.log("Transporteur email pour les urgences prêt à envoyer des messages");
  }
});

// Route pour soumettre une réclamation d'urgence
router.post('/submit', upload.single('emergencyImage'), async (req, res) => {
  try {
    const { description, location, symptoms, identifiant, latitude, longitude } = req.body;
    
    // Vérifier que les champs requis sont présents
    if (!description || !identifiant) {
      return res.status(400).json({ message: "La description et l'identifiant sont obligatoires" });
    }
    
    // Créer une nouvelle réclamation avec coordonnées GPS
    const emergencyClaim = new EmergencyClaim({
      identifiant,
      description,
      location,
      coordinates: {
        lat: latitude ? parseFloat(latitude) : null,
        lng: longitude ? parseFloat(longitude) : null
      },
      symptoms: symptoms ? JSON.parse(symptoms) : [],
      imageUrl: req.file ? `/uploads/emergency/${req.file.filename}` : null,
      createdAt: new Date()
    });
    
    // Sauvegarder dans la base de données
    await emergencyClaim.save();
    
    // Récupérer le nom de l'étudiant qui soumet la réclamation
    const student = await User.findOne({ Identifiant: identifiant });
    const studentName = student ? student.Name : "Étudiant";
    
    // Envoyer un email aux administrateurs, psychologues et enseignants
    try {
      // Récupérer la liste des utilisateurs qui doivent recevoir des notifications
      const recipients = await User.find({
        Role: { $in: ['admin', 'psychologist', 'teacher'] }
      }, 'Email Role Name').lean();
      
      if (recipients && recipients.length > 0) {
        const emailList = recipients.map(user => user.Email).join(',');
        
        // Liste des symptômes pour l'email
        let symptomsForEmail = '';
        if (symptoms) {
          const parsedSymptoms = JSON.parse(symptoms);
          if (parsedSymptoms.length > 0) {
            symptomsForEmail = parsedSymptoms.map(s => 
              `<span style="display:inline-block; margin:2px 5px; padding:3px 8px; background-color:${getSeverityColor(s.severity)}; color:black; border-radius:4px; font-size:12px;">
                ${s.name} (${s.severity})
              </span>`
            ).join(' ');
          } else {
            symptomsForEmail = '<em>Aucun symptôme spécifié</em>';
          }
        }

        // Section carte Google Maps
        let googleMapsSection = '';
        if (emergencyClaim.coordinates && emergencyClaim.coordinates.lat && emergencyClaim.coordinates.lng) {
          // Icône personnalisée pour Google Maps représentant une personne malade
          const personIcon = 'https://i.imgur.com/qgtR0v3.png'; // URL d'une icône de personne malade
          
          // Générer l'image statique de la carte
          const mapImageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${emergencyClaim.coordinates.lat},${emergencyClaim.coordinates.lng}&zoom=15&size=600x300&maptype=roadmap&markers=icon:${personIcon}|${emergencyClaim.coordinates.lat},${emergencyClaim.coordinates.lng}&key=AIzaSyDxNmY6XebyJbi8eb0LkQhOCCTPh4x71D8`;
          
          // URL pour ouvrir Google Maps directement
          const googleMapsUrl = `https://www.google.com/maps?q=${emergencyClaim.coordinates.lat},${emergencyClaim.coordinates.lng}`;
          
          googleMapsSection = `
            <div style="margin: 15px 0;">
              <h4 style="color: #333;"></h4>
              <div style="text-align: center;">
                
                <div style="margin-top: 10px;">
                  <a href="${googleMapsUrl}" 
                     target="_blank" 
                     style="background-color: #4285F4; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">
                    <img src="https://i.imgur.com/q6jYcD5.png" alt="Maps" style="height: 18px; vertical-align: middle; margin-right: 8px;"/>
                    Voir sur Google Maps-
                  </a>
                </div>
              </div>
            </div>
          `;
        }
        
        // Configuration de l'email
        const mailOptions = {
          from: process.env.EMAIL_USER || 'notifications@unimindcare.com',
          to: emailList,
          subject: `🚨 URGENT: Cas d'urgence signalé par ${studentName} (${identifiant})`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
              <h2 style="color: #dc3545; border-bottom: 2px solid #dc3545; padding-bottom: 10px;">Réclamation d'urgence médicale</h2>
              
              <div style="background-color: #fff4f4; padding: 15px; border-left: 4px solid #dc3545; margin: 15px 0;">
                <p><strong>Étudiant:</strong> ${studentName} (${identifiant})</p>
                <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Localisation:</strong> ${location || 'Non spécifiée'}</p>
              </div>
              
              ${googleMapsSection}
              
              <div style="margin: 15px 0;">
                <h4 style="color: #333;">Symptômes signalés:</h4>
                <div style="background-color: #f8f9fa; padding: 10px; border-radius: 5px;">
                  ${symptomsForEmail}
                </div>
              </div>
              
              <div style="margin: 15px 0;">
                <h4 style="color: #333;">Description:</h4>
                <p style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; color: #333;">${description}</p>
              </div>
              
             
              
              <div style="text-align: center; margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/emergency-claims/${emergencyClaim._id}" 
                   style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Traiter cette réclamation
                </a>
              </div>
              
              <p style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
                Ceci est un message automatique. Merci de ne pas répondre directement à cet email.
              </p>
            </div>
          `
        };
        
        // Envoyer l'email
        await transporter.sendMail(mailOptions);
        
        // Marquer que les notifications ont été envoyées
        emergencyClaim.notificationsSent = true;
        await emergencyClaim.save();
      }
    } catch (emailError) {
      console.error("Erreur lors de l'envoi de l'email de notification:", emailError);
      // Ne pas échouer la requête si l'envoi de mail échoue
    }
    
    // Réponse de succès
    res.status(201).json({
      message: "Réclamation d'urgence envoyée avec succès",
      claimId: emergencyClaim._id
    });
    
  } catch (err) {
    console.error("Erreur lors de la soumission de la réclamation d'urgence:", err);
    res.status(500).json({ 
      message: "Une erreur est survenue lors de la soumission de la réclamation", 
      error: err.message 
    });
  }
});

// Route pour récupérer toutes les réclamations d'un utilisateur
router.get('/user/:identifiant', authenticateToken, async (req, res) => {
  try {
    const { identifiant } = req.params;
    
    // Vérifier que l'utilisateur authentifié peut accéder à ces données
    if (req.user.identifiant !== identifiant && !req.user.Role.includes('admin')) {
      return res.status(403).json({ message: "Non autorisé à accéder à ces données" });
    }
    
    const claims = await EmergencyClaim.find({ identifiant })
      .sort({ createdAt: -1 }) // Trier par date décroissante
      .lean();
    
    res.json(claims);
  } catch (err) {
    console.error("Erreur lors de la récupération des réclamations:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// Route pour récupérer toutes les réclamations (accès admin, psychologue et enseignant)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur a les droits nécessaires
    const allowedRoles = ['admin', 'psychologist', 'teacher'];
    const hasPermission = req.user.Role.some(role => allowedRoles.includes(role));
    
    if (!hasPermission) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }
    
    // Paramètres de pagination optionnels
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Paramètres de filtrage optionnels
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.identifiant) filter.identifiant = req.query.identifiant;
    
    // Récupérer les réclamations avec pagination
    const claims = await EmergencyClaim.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Compter le nombre total d'éléments pour la pagination
    const totalCount = await EmergencyClaim.countDocuments(filter);
    
    res.json({
      claims,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error("Erreur lors de la récupération des réclamations:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// Route pour mettre à jour le statut d'une réclamation (accès admin, psychologue et enseignant)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur a les droits nécessaires
    const allowedRoles = ['admin', 'psychologist', 'teacher'];
    const hasPermission = req.user.Role.some(role => allowedRoles.includes(role));
    
    if (!hasPermission) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }
    
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // Valider le statut
    if (!['pending', 'processing', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }
    
    // Mise à jour du statut
    const updatedClaim = await EmergencyClaim.findByIdAndUpdate(
      id,
      {
        status,
        notes,
        updatedAt: new Date(),
        handledBy: {
          userId: req.user.identifiant,
          name: req.user.name,
          role: req.user.Role[0],
          timestamp: new Date()
        }
      },
      { new: true } // Retourner le document mis à jour
    );
    
    if (!updatedClaim) {
      return res.status(404).json({ message: "Réclamation non trouvée" });
    }
    
    // Envoyer un email de notification à l'étudiant si son statut a changé
    try {
      // Récupérer l'email de l'étudiant
      const student = await User.findOne(
        { Identifiant: updatedClaim.identifiant },
        'Email Name'
      );
      
      if (student && student.Email) {
        // Section Google Maps pour l'email de mise à jour
        let googleMapsSection = '';
        if (updatedClaim.coordinates && updatedClaim.coordinates.lat && updatedClaim.coordinates.lng) {
          const personIcon = 'https://i.imgur.com/qgtR0v3.png'; // URL de l'icône de personne malade
          const mapImageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${updatedClaim.coordinates.lat},${updatedClaim.coordinates.lng}&zoom=15&size=600x300&maptype=roadmap&markers=icon:${personIcon}|${updatedClaim.coordinates.lat},${updatedClaim.coordinates.lng}&key=AIzaSyDxNmY6XebyJbi8eb0LkQhOCCTPh4x71D8`;
          const googleMapsUrl = `https://www.google.com/maps?q=${updatedClaim.coordinates.lat},${updatedClaim.coordinates.lng}`;
          
          googleMapsSection = `
            <div style="margin: 15px 0;">
              <h4 style="color: #333;">Votre localisation:</h4>
              <div style="text-align: center;">
                <img src="${mapImageUrl}" 
                     alt="Localisation de l'urgence" 
                     style="max-width: 100%; height: auto; border-radius: 5px; border: 1px solid #ddd;" />
              </div>
            </div>
          `;
        }

        // Configuration de l'email
        const mailOptions = {
          from: process.env.EMAIL_USER || 'notifications@unimindcare.com',
          to: student.Email,
          subject: `Mise à jour de votre réclamation d'urgence - ${getStatusLabel(status)}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
              <h2 style="color: #7366ff; border-bottom: 2px solid #7366ff; padding-bottom: 10px;">Mise à jour de votre réclamation d'urgence</h2>
              
              <div style="background-color: ${getStatusColor(status)}; padding: 15px; border-radius: 5px; margin: 15px 0; color: black;">
                <h3 style="margin-top: 0;">Statut: ${getStatusLabel(status)}</h3>
              </div>
              
              <p>Bonjour ${student.Name || 'cher(e) étudiant(e)'},</p>
              <p>Votre réclamation d'urgence soumise le ${new Date(updatedClaim.createdAt).toLocaleString()} a été mise à jour.</p>
              
              ${googleMapsSection}
              
              ${notes ? `
              <div style="margin: 15px 0;">
                <h4 style="color: #333;">Note de l'administration:</h4>
                <p style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; color: #333;">${notes}</p>
              </div>
              ` : ''}
              
              <div style="text-align: center; margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/emergency-claims" 
                   style="background-color: #7366ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Voir mes réclamations
                </a>
              </div>
              
              <p style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
                Ceci est un message automatique. Si vous avez des questions, veuillez contacter directement le service de santé universitaire.
              </p>
            </div>
          `
        };
        
        // Envoyer l'email
        await transporter.sendMail(mailOptions);
      }
    } catch (emailError) {
      console.error("Erreur lors de l'envoi de l'email de notification:", emailError);
      // Ne pas échouer la requête si l'envoi de mail échoue
    }
    
    res.json({
      message: "Statut mis à jour avec succès",
      claim: updatedClaim
    });
  } catch (err) {
    console.error("Erreur lors de la mise à jour du statut:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// Fonction pour obtenir une couleur selon le statut
function getStatusColor(status) {
  switch (status) {
    case 'pending':
      return '#fff3cd'; // warning yellow with black text
    case 'processing':
      return '#cff4fc'; // info blue with black text
    case 'resolved':
      return '#d1e7dd'; // success green with black text
    case 'rejected':
      return '#f8d7da'; // danger red with black text
    default:
      return '#e9ecef'; // secondary gray with black text
  }
}

// Fonction pour obtenir un libellé selon le statut
function getStatusLabel(status) {
  switch (status) {
    case 'pending':
      return 'En attente de traitement';
    case 'processing':
      return 'En cours de traitement';
    case 'resolved':
      return 'Résolu';
    case 'rejected':
      return 'Rejeté';
    default:
      return 'Statut inconnu';
  }
}

// Fonction pour obtenir une couleur selon la gravité des symptômes
function getSeverityColor(severity) {
  switch (severity?.toLowerCase()) {
    case 'high':
    case 'grave':
      return '#ffcccc'; // light red
    case 'medium':
    case 'modéré':
      return '#fff2cc'; // light yellow
    case 'low':
    case 'léger':
      return '#ccffcc'; // light green
    default:
      return '#e9ecef'; // light gray
  }
}

module.exports = router;