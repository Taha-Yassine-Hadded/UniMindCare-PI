require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const router = express.Router();
const Response = require('../models/Response');
const User = require('../models/Users');
const Points = require('../models/Points');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Vérification des variables d'environnement
console.log("JWT_SECRET disponible:", !!process.env.JWT_SECRET);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS présent:", !!process.env.EMAIL_PASS);

// Configuration du transporteur d'email
const transporterEmail = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  debug: true, // Pour voir les logs détaillés en cas de problème avec l'envoi
});

// Vérification initiale du transporteur
transporterEmail.verify((error, success) => {
  if (error) {
    console.error("Erreur de configuration du transporteur email:", error);
  } else {
    console.log("Serveur email prêt à envoyer des messages");
  }
});

// Liste des questions du questionnaire
const questions = [
  { id: 1, text: "À quelle fréquence vous êtes-vous senti dépassé(e) par votre charge de travail cette semaine?", options: ["Jamais", "Rarement", "Parfois", "Souvent", "Constamment"] },
  { id: 2, text: "Comment évaluez-vous votre niveau de concentration pendant les cours?", options: ["Excellent", "Bon", "Moyen", "Faible", "Très faible"] },
  { id: 3, text: "Avez-vous ressenti de l'anxiété avant les examens ou présentations?", options: ["Pas du tout", "Légèrement", "Modérément", "Beaucoup", "Extrêmement"] },
  { id: 4, text: "Comment qualifieriez-vous votre niveau d'énergie en fin de journée?", options: ["Très élevé", "Élevé", "Moyen", "Bas", "Épuisé(e)"] },
  { id: 5, text: "Avez-vous eu des difficultés à vous endormir en pensant à vos études?", options: ["Jamais", "Rarement", "Parfois", "Souvent", "Chaque nuit"] },
  { id: 6, text: "Avez-vous eu des moments de doute concernant vos capacités académiques?", options: ["Jamais", "Rarement", "Parfois", "Souvent", "Constamment"] },
  { id: 7, text: "À quelle fréquence avez-vous pu participer à des activités sociales cette semaine?", options: ["Très souvent", "Souvent", "Parfois", "Rarement", "Jamais"] },
  { id: 8, text: "Avez-vous ressenti une pression de la part de vos professeurs ou parents?", options: ["Pas du tout", "Légèrement", "Modérément", "Beaucoup", "Extrêmement"] },
  { id: 9, text: "Comment évaluez-vous votre équilibre entre vie académique et personnelle?", options: ["Parfait", "Bon", "Acceptable", "Déséquilibré", "Très déséquilibré"] },
  { id: 10, text: "Avez-vous ressenti de la satisfaction après avoir terminé vos travaux académiques?", options: ["Toujours", "Souvent", "Parfois", "Rarement", "Jamais"] },
];

// Middleware d'authentification JWT
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token non fourni' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("Erreur de vérification JWT:", err);
      return res.status(403).json({ message: 'Token invalide ou expiré' });
    }
    req.user = decoded;
    next();
  });
};

// Route publique : Récupérer les questions
router.get('/questions', (req, res) => {
  res.status(200).json(questions);
});

// Route protégée : Soumettre les réponses
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { userId, answers } = req.body;
    if (!userId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Données invalides' });
    }

    // Vérifier l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      console.log("Utilisateur non trouvé pour ID:", userId);
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Calculer le score
    let score = 0;
    answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question || !question.options.includes(answer.answer)) {
        throw new Error(`Réponse invalide pour la question ${answer.questionId}`);
      }
      const value = question.options.indexOf(answer.answer) + 1;
      if ([1, 3, 5, 6, 8].includes(answer.questionId)) {
        score += value; // Échelle directe (plus élevé = pire)
      } else {
        score += (6 - value); // Échelle inversée (plus bas = pire)
      }
    });

    // Déterminer l'état émotionnel et les recommandations
    let emotionalState = "";
    let recommendations = [];
    if (score <= 15) {
      emotionalState = "Excellent état psychologique";
      recommendations = [
        "Continuez à maintenir cet équilibre.",
        "Partagez vos stratégies de gestion du stress avec vos camarades.",
        "Envisagez de participer à des programmes de mentorat."
      ];
    } else if (score <= 25) {
      emotionalState = "Bon état psychologique";
      recommendations = [
        "Prenez du temps pour des activités relaxantes.",
        "Maintenez une routine de sommeil régulière.",
        "Continuez à équilibrer travail et loisirs."
      ];
    } else if (score <= 35) {
      emotionalState = "État psychologique moyen - Soyez vigilant";
      recommendations = [
        "Essayez des techniques de respiration ou de méditation.",
        "Établissez un planning plus structuré.",
        "Parlez de vos préoccupations à un ami ou conseiller."
      ];
    } else if (score <= 45) {
      emotionalState = "État psychologique préoccupant";
      recommendations = [
        "Consultez un conseiller pédagogique ou psychologue.",
        "Révisez vos méthodes d'étude et d'organisation.",
        "Accordez-vous des pauses régulières."
      ];
    } else {
      emotionalState = "État psychologique très préoccupant";
      recommendations = [
        "Consultez rapidement un professionnel de la santé mentale.",
        "Parlez de votre situation à votre famille ou un proche.",
        "Réduisez temporairement votre charge de travail si possible."
      ];
    }

    // Enregistrer la réponse
    const response = new Response({
      userId,
      answers,
      score,
      emotionalState,
      recommendations,
    });
    await response.save();
    console.log("Réponse enregistrée pour userId:", userId);

    // Gestion des points
    let userPoints = await Points.findOne({ userId });
    if (!userPoints) {
      userPoints = new Points({
        userId,
        points: 0,
        history: [],
      });
    }
    userPoints.points += 20;
    userPoints.history.push({
      action: "Questionnaire bien-être complété",
      points: 20,
      date: new Date(),
    });
    await userPoints.save();
    console.log("Points mis à jour pour userId:", userId, "Total:", userPoints.points);

    // Envoi de l'email
    const currentDate = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const mailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background-color: #4a6fdc; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; border: 1px solid #ddd; }
          .score { font-size: 20px; font-weight: bold; color: ${score <= 25 ? '#28a745' : '#dc3545'}; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>UniMindCare</h1>
          <p>Résultats de votre questionnaire - ${currentDate}</p>
        </div>
        <div class="content">
          <p>Bonjour ${user.Name || 'Étudiant'},</p>
          <p>Votre score: <span class="score">${score}/50</span></p>
          <p>État émotionnel: <strong>${emotionalState}</strong></p>
          <h3>Recommandations:</h3>
          <ul>${recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>
          <p>Vous avez gagné 20 points ! Total actuel: ${userPoints.points}</p>
          <p>L'équipe UniMindCare</p>
        </div>
      </body>
      </html>
    `;
    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: user.Email,
      subject: `Résultats de votre questionnaire - ${currentDate}`,
      html: mailHtml,
    };
    await transporterEmail.sendMail(mailOptions)
      .then(() => console.log("Email envoyé à:", user.Email))
      .catch(err => console.error("Erreur envoi email:", err));

    // Réponse au client
    res.status(201).json({
      score,
      emotionalState,
      recommendations,
      pointsEarned: 20,
      totalPoints: userPoints.points,
    });
  } catch (error) {
    console.error("Erreur lors de la soumission:", error.message);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

// Route protégée : Historique des réponses
router.get('/history/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await Response.find({ userId }).sort({ createdAt: -1 });
    if (!history.length) {
      return res.status(404).json({ message: "Aucun historique trouvé" });
    }
    res.status(200).json(history);
  } catch (error) {
    console.error("Erreur récupération historique:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Route protégée : Points de l'utilisateur
router.get('/points/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    const pointsData = await Points.findOne({ userId }) || {
      userId,
      points: 0,
      history: [],
    };
    res.status(200).json(pointsData);
  } catch (error) {
    console.error("Erreur récupération points:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;