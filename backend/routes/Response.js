const express = require('express');
const router = express.Router();
const { Response } = require('../models/Response');
const User = require('../models/Users');

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

// Soumettre les réponses et analyser l'état mental
router.post('/submit', async (req, res) => {
  try {
    const { userId, answers } = req.body;

    // Vérifier l'existence de l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Calculer le score total (plus le score est élevé, plus l'état mental est préoccupant)
    // Pour certaines questions, on inverse le score (questions 1, 3, 5, 6, 8)
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

    // Enregistrer les résultats
    const response = new Response({
      userId,
      answers,
      score,
      emotionalState,
      recommendations
    });

    await response.save();

    res.status(201).json({
      score,
      emotionalState,
      recommendations
    });

  } catch (error) {
    console.error("Erreur lors de la soumission du questionnaire:", error);
    res.status(500).json({ message: "Erreur serveur" });
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

module.exports = router;