require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const User = require('../Models/Users');
const nodemailer = require('nodemailer');

// Middleware d'authentification simplifié
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Token d'authentification requis" });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_clé_secrète_jwt');
    
    const user = await User.findOne({ Identifiant: decoded.identifiant });
    
    if (!user) {
      return res.status(401).json({ message: "Utilisateur non trouvé" });
    }
    
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
  latitude: Number,  // Ajout de champ directement au modèle
  longitude: Number, // Ajout de champ directement au modèle
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
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  severityScore: {
    type: Number,
    default: 0
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
    next();
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
    
    if (!description || !identifiant) {
      return res.status(400).json({ message: "La description et l'identifiant sont obligatoires" });
    }
    
    // Analyser les symptômes pour calculer un score de sévérité
    const parsedSymptoms = symptoms ? JSON.parse(symptoms) : [];
    const severityScore = calculateSeverityScore(parsedSymptoms);
    
    // Déterminer le niveau de sévérité basé sur le score
    let severityLevel = 'medium';
    if (severityScore > 8) {
      severityLevel = 'high';
    } else if (severityScore < 5) {
      severityLevel = 'low';
    }
    
    // Créer une nouvelle réclamation avec coordonnées GPS et score de sévérité
    const emergencyClaim = new EmergencyClaim({
      identifiant,
      description,
      location,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      coordinates: {
        lat: latitude ? parseFloat(latitude) : null,
        lng: longitude ? parseFloat(longitude) : null
      },
      symptoms: parsedSymptoms,
      imageUrl: req.file ? `/uploads/emergency/${req.file.filename}` : null,
      severity: severityLevel,
      severityScore: severityScore,
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
        if (latitude && longitude) {
          // Icône personnalisée pour Google Maps représentant une personne malade
          const personIcon = 'https://i.imgur.com/qgtR0v3.png';
          
          // URL pour ouvrir Google Maps directement
          const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
          
          googleMapsSection = `
            <div style="margin: 15px 0;">
              <h4 style="color: #333;"></h4>
              <div style="text-align: center;">
                <div style="margin-top: 10px;">
                  <a href="${googleMapsUrl}" 
                     target="_blank" 
                     style="background-color: #4285F4; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">
                    <img src="https://i.imgur.com/q6jYcD5.png" alt="Maps" style="height: 18px; vertical-align: middle; margin-right: 8px;"/>
                    Voir sur Google Maps
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
      .sort({ createdAt: -1 })
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

// Nouvelle route pour récupérer TOUS les cas d'urgence pour la carte
router.get('/all-claims', authenticateToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur a les droits nécessaires
    const allowedRoles = ['admin', 'psychologist', 'teacher'];
    let hasPermission = false;
    
    if (req.user && req.user.Role) {
      // Gérer à la fois le cas où Role est un tableau et où c'est une chaîne
      if (Array.isArray(req.user.Role)) {
        hasPermission = req.user.Role.some(role => allowedRoles.includes(role));
      } else if (typeof req.user.Role === 'string') {
        hasPermission = allowedRoles.includes(req.user.Role);
      }
    }
    
    if (!hasPermission) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }
    
    // Récupérer tous les cas avec coordonnées, limités aux derniers 100 cas
    const claims = await EmergencyClaim.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .select('_id identifiant description latitude longitude location status severity severityScore symptoms createdAt');
    
    res.json(claims);
  } catch (error) {
    console.error('Erreur lors de la récupération des cas d\'urgence:', error);
    res.status(500).json({ message: "Une erreur est survenue lors de la récupération des données" });
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
        if (updatedClaim.latitude && updatedClaim.longitude) {
          const googleMapsUrl = `https://www.google.com/maps?q=${updatedClaim.latitude},${updatedClaim.longitude}`;
          
          googleMapsSection = `
            <div style="margin: 15px 0;">
              <h4 style="color: #333;">Votre localisation:</h4>
              <div style="text-align: center;">
                <a href="${googleMapsUrl}" target="_blank" style="color: #0066cc;">
                  Voir votre position sur Google Maps
                </a>
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

// Route pour récupérer les cas prioritaires en attente
router.get('/pending-prioritized', authenticateToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur a les droits nécessaires
    const allowedRoles = ['admin', 'psychologist', 'teacher'];
    let hasPermission = false;
    
    if (req.user && req.user.Role) {
      // Gérer à la fois le cas où Role est un tableau et où c'est une chaîne
      if (Array.isArray(req.user.Role)) {
        hasPermission = req.user.Role.some(role => allowedRoles.includes(role));
      } else if (typeof req.user.Role === 'string') {
        hasPermission = allowedRoles.includes(req.user.Role);
      }
    }
    
    if (!hasPermission) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }
    
    // Récupérer tous les cas en attente
    const pendingClaims = await EmergencyClaim.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .lean();
    
    // Analyser la gravité des symptômes pour chaque réclamation
    const prioritizedClaims = pendingClaims.map(claim => {
      // Calculer un score de priorité basé sur les symptômes
      const severityScore = claim.severityScore || calculateSeverityScore(claim.symptoms);
      
      return {
        ...claim,
        severityScore,
        timeElapsed: Date.now() - new Date(claim.createdAt).getTime()
      };
    });
    
    // Trier par score de sévérité (décroissant) et par temps écoulé (décroissant)
    prioritizedClaims.sort((a, b) => {
      // D'abord par score de sévérité
      if (b.severityScore !== a.severityScore) {
        return b.severityScore - a.severityScore;
      }
      // Ensuite par temps écoulé
      return b.timeElapsed - a.timeElapsed;
    });
    
    // Renvoyer les résultats
    res.json(prioritizedClaims);
  } catch (err) {
    console.error("Erreur lors de la récupération des cas prioritaires:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// Route pour obtenir des statistiques sur les urgences
// Route pour obtenir des statistiques sur les urgences
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur a les droits nécessaires
    const allowedRoles = ['admin', 'psychologist', 'teacher'];
    let hasPermission = false;
    
    if (req.user && req.user.Role) {
      // Gérer à la fois le cas où Role est un tableau et où c'est une chaîne
      if (Array.isArray(req.user.Role)) {
        hasPermission = req.user.Role.some(role => allowedRoles.includes(role));
      } else if (typeof req.user.Role === 'string') {
        hasPermission = allowedRoles.includes(req.user.Role);
      }
    }
    
    if (!hasPermission) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }
    
    // Statistiques par statut
    const statsByStatus = await EmergencyClaim.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Statistiques par symptôme (au lieu de sévérité)
    const symptomStats = await EmergencyClaim.aggregate([
      {
        $unwind: {
          path: "$symptoms",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $ifNull: ["$symptoms.category", false] },
              "$symptoms.category", 
              "Autre"
            ]
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: {
            $cond: [
              { $eq: ["$_id", ""] },
              "Autre",
              "$_id"
            ]
          },
          count: 1
        }
      }
    ]);
    
    // Si pas de catégories, créer des valeurs par défaut
    if (!symptomStats || symptomStats.length === 0) {
      symptomStats.push({ _id: 'stress', count: 0 });
      symptomStats.push({ _id: 'depression', count: 0 });
      symptomStats.push({ _id: 'physical', count: 0 });
    }
    
    // S'assurer que toutes les catégories principales existent
    const existingCategories = symptomStats.map(s => s._id);
    
    if (!existingCategories.includes('stress')) {
      symptomStats.push({ _id: 'stress', count: 0 });
    }
    if (!existingCategories.includes('depression')) {
      symptomStats.push({ _id: 'depression', count: 0 });
    }
    if (!existingCategories.includes('physical')) {
      symptomStats.push({ _id: 'physical', count: 0 });
    }
    
    // Statistiques des dernières 24 heures
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);
    
    const recentStats = await EmergencyClaim.aggregate([
      {
        $match: {
          createdAt: { $gte: last24Hours }
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Statistiques quotidiennes des 30 derniers jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyStatsResults = await EmergencyClaim.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          count: { $sum: 1 },
          date: { $first: "$createdAt" }
        }
      },
      {
        $sort: { date: -1 }
      }
    ]);
    
    // Formater les statistiques quotidiennes
    const dailyStats = dailyStatsResults.map(item => ({
      date: item.date,
      year: item._id.year,
      month: item._id.month,
      day: item._id.day,
      count: item.count
    }));
    
    // Statistiques mensuelles de la dernière année
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const monthlyStatsResults = await EmergencyClaim.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 },
          date: { $first: "$createdAt" }
        }
      },
      {
        $sort: { date: -1 }
      }
    ]);
    
    // Formater les statistiques mensuelles
    const monthlyStats = monthlyStatsResults.map(item => ({
      date: item.date,
      year: item._id.year,
      month: item._id.month,
      count: item.count
    }));
    
    // Cas non résolus par symptôme (pour identifier les tendances)
    const unresolvedBySymptom = await EmergencyClaim.aggregate([
      {
        $match: {
          status: { $in: ['pending', 'processing'] }
        }
      },
      {
        $unwind: "$symptoms"
      },
      {
        $group: {
          _id: "$symptoms.name",
          count: { $sum: 1 },
          highSeverity: {
            $sum: {
              $cond: [
                { $in: ["$symptoms.severity", ["high", "grave"]] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { highSeverity: -1, count: -1 }
      }
    ]);
    
    res.json({
      statsByStatus,
      symptomStats,      // Remplacé severityStats par symptomStats
      recentStats,
      dailyStats,
      monthlyStats,
      unresolvedBySymptom
    });
  } catch (err) {
    console.error("Erreur lors de la récupération des statistiques:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// Fonction pour calculer un score de sévérité basé sur les symptômes
function calculateSeverityScore(symptoms) {
  if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
    return 0;
  }
  
  let totalScore = 0;
  
  for (const symptom of symptoms) {
    switch (symptom.severity?.toLowerCase()) {
      case 'high':
      case 'grave':
        totalScore += 10;
        break;
      case 'medium':
      case 'modéré':
        totalScore += 5;
        break;
      case 'low':
      case 'léger':
        totalScore += 2;
        break;
      default:
        totalScore += 1;
    }
    
    // Donner plus de poids aux symptômes de certaines catégories
    if (symptom.category?.toLowerCase() === 'mental') {
      totalScore += 2; // Les problèmes mentaux sont prioritaires dans ce contexte
    }
  }
  
  return totalScore;
}

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