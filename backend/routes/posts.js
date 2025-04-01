// routes/posts.js
const express = require('express');
const router = express.Router();
const Post = require('../Models/Post');
const passport = require('../routes/passportConfig');

// Fonction pour générer un pseudo anonyme
const generateAnonymousPseudo = () => {
  const randomNum = Math.floor(Math.random() * 1000); // Nombre aléatoire entre 0 et 999
  return `Anonyme${randomNum}`;
};

// Route pour ajouter une publication
router.post('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
  console.log('Requête POST reçue sur /api/posts avec :', req.body);
  const { title, content, isAnonymous } = req.body; // Ajout de isAnonymous

  try {
    const post = new Post({
      title,
      content,
      author: req.user._id, // ID de l'utilisateur connecté
      isAnonymous: isAnonymous || false, // Par défaut false si non fourni
      anonymousPseudo: isAnonymous ? generateAnonymousPseudo() : null // Pseudo si anonyme
    });
    await post.save();
    console.log('Publication créée:', post);
    res.status(201).json(post);
  } catch (error) {
    console.error('Erreur lors de la création:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour récupérer toutes les publications
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().populate('author', 'Name'); // Récupère le nom de l'auteur
    console.log('Publications récupérées:', posts);
    res.status(200).json(posts);
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'Name') // Peupler l'auteur du post
      .populate('comments.author', 'Name'); // Peupler les auteurs des commentaires
    if (!post) return res.status(404).json({ message: 'Publication non trouvée' });
    res.status(200).json(post);
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour ajouter un commentaire
router.post('/:id/comments', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const { content, isAnonymous } = req.body;

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Publication non trouvée' });

    const comment = {
      content,
      author: req.user._id,
      isAnonymous: isAnonymous || false,
      anonymousPseudo: isAnonymous ? generateAnonymousPseudo() : null,
    };

    post.comments.push(comment);
    await post.save();

    // Peupler les données après l'ajout du commentaire pour renvoyer une réponse complète
    const updatedPost = await Post.findById(req.params.id)
      .populate('author', 'Name')
      .populate('comments.author', 'Name');
    res.status(201).json(updatedPost);
  } catch (error) {
    console.error("Erreur lors de l'ajout du commentaire:", error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;