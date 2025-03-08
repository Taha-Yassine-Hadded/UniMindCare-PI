require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const express = require('express');
const router = express.Router();
const { Response } = require('../models/Response');
const User = require('../Models/Users');
const Points = require('../models/Points');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

console.log("JWT_SECRET disponible:", !!process.env.JWT_SECRET);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS présent:", !!process.env.EMAIL_PASS);

// Configurer le transporteur d'email avec plus d'options et de débogage
const transporterEmail = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  debug: true
});

// Tester la configuration du transporteur
transporterEmail.verify(function(error, success) {
  if (error) {
    console.error("Erreur de configuration du transporteur email:", error);
  } else {
    console.log("Serveur email prêt à envoyer des messages");
  }
});

// Les questions du questionnaire
const questions = [
  {
    id: 1,
    text: "À quelle fréquence vous êtes-vous senti dépassé(e) par votre charge de travail cette semaine?",
    options: ["Jamais", "Rarement", "Parfois", "Souvent", "Constamment"]
  },
  {
    id: 2,
    text: "Comment évaluez-vous votre niveau de concentration pendant les cours?",
    options: ["Excellent", "Bon", "Moyen", "Faible", "Très faible"]
  },
  {
    id: 3,
    text: "Avez-vous ressenti de l'anxiété avant les examens ou présentations?",
    options: ["Pas du tout", "Légèrement", "Modérément", "Beaucoup", "Extrêmement"]
  },
  {
    id: 4,
    text: "Comment qualifieriez-vous votre niveau d'énergie en fin de journée?",
    options: ["Très élevé", "Élevé", "Moyen", "Bas", "Épuisé(e)"]
  },
  {
    id: 5,
    text: "Avez-vous eu des difficultés à vous endormir en pensant à vos études?",
    options: ["Jamais", "Rarement", "Parfois", "Souvent", "Chaque nuit"]
  },
  {
    id: 6,
    text: "Avez-vous eu des moments de doute concernant vos capacités académiques?",
    options: ["Jamais", "Rarement", "Parfois", "Souvent", "Constamment"]
  },
  {
    id: 7,
    text: "À quelle fréquence avez-vous pu participer à des activités sociales cette semaine?",
    options: ["Très souvent", "Souvent", "Parfois", "Rarement", "Jamais"]
  },
  {
    id: 8,
    text: "Avez-vous ressenti une pression de la part de vos professeurs ou parents?",
    options: ["Pas du tout", "Légèrement", "Modérément", "Beaucoup", "Extrêmement"]
  },
  {
    id: 9,
    text: "Comment évaluez-vous votre équilibre entre vie académique et personnelle?",
    options: ["Parfait", "Bon", "Acceptable", "Déséquilibré", "Très déséquilibré"]
  },
  {
    id: 10,
    text: "Avez-vous ressenti de la satisfaction après avoir terminé vos travaux académiques?",
    options: ["Toujours", "Souvent", "Parfois", "Rarement", "Jamais"]
  }
];

// Récupérer les questions
router.get('/questions', (req, res) => {
  res.json(questions);
});

// Middleware d'authentification
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token non fourni' });
  }

  const token = authHeader.split(' ')[1];
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Token invalide' });
    req.user = decoded;
    next();
  });
};

// Soumettre les réponses et analyser l'état mental
router.post('/submit', async (req, res) => {
  try {
    const { userId, answers } = req.body;
    console.log("Traitement de la soumission pour userId:", userId);

    // Vérifier l'existence de l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      console.log("Utilisateur non trouvé avec ID:", userId);
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    
    console.log("Utilisateur trouvé:", user.Email);

    // Calculer le score total
    let score = 0;
    answers.forEach(answer => {
      const questionId = answer.questionId;
      let value = answer.answer;
      
      // Questions où 5 est négatif (stress, anxiété, etc.)
      if ([1, 3, 5, 6, 8].includes(questionId)) {
        score += value;
      } 
      // Questions où 1 est négatif (énergie faible, satisfaction faible, etc.)
      else {
        score += (6 - value); // Inversion de l'échelle (5→1, 4→2, etc.)
      }
    });
    
    console.log("Score calculé:", score);

    // Déterminer l'état émotionnel
    let emotionalState = "";
    let recommendations = [];

    if (score <= 15) {
      emotionalState = "Excellent état psychologique";
      recommendations = [
        "Continuez à maintenir cet équilibre",
        "Partagez vos stratégies de gestion du stress avec vos camarades",
        "Envisagez de participer à des programmes de mentorat"
      ];
    } else if (score <= 25) {
      emotionalState = "Bon état psychologique";
      recommendations = [
        "Prenez du temps pour des activités relaxantes",
        "Maintenez une routine de sommeil régulière",
        "Continuez à équilibrer travail et loisirs"
      ];
    } else if (score <= 35) {
      emotionalState = "État psychologique moyen - Soyez vigilant";
      recommendations = [
        "Essayez des techniques de respiration et de méditation",
        "Établissez un planning plus structuré",
        "Parlez de vos préoccupations à un ami ou conseiller"
      ];
    } else if (score <= 45) {
      emotionalState = "État psychologique préoccupant";
      recommendations = [
        "Consultez un conseiller pédagogique ou psychologue",
        "Révisez vos méthodes d'étude et d'organisation",
        "Accordez-vous des pauses régulières et des activités plaisantes",
        "Pratiquez des exercices de relaxation quotidiennement"
      ];
    } else {
      emotionalState = "État psychologique très préoccupant";
      recommendations = [
        "Consultez rapidement un professionnel de la santé mentale",
        "Parlez de votre situation à votre famille ou à un conseiller",
        "Envisagez une réduction temporaire de votre charge de travail",
        "Concentrez-vous sur vos besoins fondamentaux: sommeil, alimentation, exercice"
      ];
    }

    console.log("État émotionnel déterminé:", emotionalState);

    // Enregistrer les résultats
    const response = new Response({
      userId,
      answers,
      score,
      emotionalState,
      recommendations
    });

    await response.save();
    console.log("Réponse enregistrée avec succès");

    // NOUVEAU : Ajouter des points à l'utilisateur
    console.log("Ajout des points pour l'utilisateur:", userId);
    let userPoints = await Points.findOne({ userId });
    
    if (!userPoints) {
      console.log("Création d'un nouveau document Points");
      userPoints = new Points({
        userId,
        points: 0,
        history: []
      });
    }
    
    // Ajouter 20 points
    userPoints.points += 20;
    userPoints.history.push({
      action: "Questionnaire bien-être complété",
      points: 20,
      date: new Date()
    });
    
    await userPoints.save();
    console.log("Points ajoutés avec succès. Total:", userPoints.points);
    
    // NOUVEAU : Envoyer un email avec les résultats
    console.log("Préparation de l'email pour:", user.Email);
    const currentDate = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    // Construire l'email HTML
    const mailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .header {
          background-color: #4a6fdc;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          padding: 20px;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 5px 5px;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #666;
        }
        .result {
          margin: 20px 0;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 5px;
        }
        .score {
          font-size: 24px;
          font-weight: bold;
          color: ${
            score <= 15 ? '#28a745' : 
            score <= 25 ? '#17a2b8' : 
            score <= 35 ? '#ffc107' : 
            '#dc3545'
          };
        }
        ul {
          padding-left: 20px;
        }
        .badge {
          display: inline-block;
          background-color: #ffd700;
          color: #333;
          padding: 5px 10px;
          border-radius: 20px;
          font-weight: bold;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>UniMindCare</h1>
        <p>Résultats de votre questionnaire de bien-être</p>
      </div>
      
      <div class="content">
        <p>Bonjour ${user.Name || 'Étudiant'},</p>
        
        <p>Merci d'avoir complété le questionnaire de bien-être le ${currentDate}.</p>
        
        <div class="result">
          <h2>Votre état émotionnel : <span class="score">${emotionalState}</span></h2>
          <p>Votre score : ${score}/50</p>
          
          <h3>Nos recommandations :</h3>
          <ul>
            ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
        
        <p><span class="badge">+20 points</span> Félicitations ! Vous avez gagné 20 points pour avoir complété ce questionnaire.</p>
        
        <p>N'hésitez pas à consulter nos ressources supplémentaires sur votre tableau de bord pour améliorer votre bien-être.</p>
        
        <p>Cordialement,<br>L'équipe UniMindCare</p>
      </div>
      
      <div class="footer">
        <p>Ce message a été généré automatiquement. Merci de ne pas y répondre.</p>
        <p>UniMindCare © 2025 - Tous droits réservés</p>
      </div>
    </body>
    </html>
    `;
    
    // Options de l'email
    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: user.Email,
      subject: 'Résultats de votre questionnaire de bien-être',
      html: mailHtml
    };
    
    // Envoi de l'email
    try {
      console.log("Tentative d'envoi d'email avec les options:", {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });
      
      await transporterEmail.sendMail(mailOptions);
      console.log("Email envoyé avec succès à:", user.Email);
    } catch (emailError) {
      console.error("Erreur lors de l'envoi de l'email:", emailError);
      // Ne pas bloquer la réponse en cas d'erreur d'email
    }

    // Réponse au client
    res.status(201).json({
      score,
      emotionalState,
      recommendations,
      pointsEarned: 20,
      totalPoints: userPoints.points
    });

  } catch (error) {
    console.error("Erreur lors de la soumission du questionnaire:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// Récupérer l'historique des réponses d'un utilisateur
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await Response.find({ userId }).sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Route pour récupérer les points d'un utilisateur
router.get('/points/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    
    // Récupérer les points ou créer un document vide si aucun n'existe
    let pointsData = await Points.findOne({ userId });
    
    if (!pointsData) {
      pointsData = {
        userId,
        points: 0,
        history: []
      };
    }
    
    res.json(pointsData);
  } catch (error) {
    console.error("Erreur lors de la récupération des points:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;