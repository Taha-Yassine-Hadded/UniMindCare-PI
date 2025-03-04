const express = require('express');
const router = express.Router();
const Post = require('../Models/Post');
const passport = require('../routes/passportConfig'); // Ton passport configuré

// Route pour ajouter une publication (protégée par JWT)
router.post('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
  console.log('Requête POST reçue sur /api/posts avec :', req.body);
  const { title, content } = req.body;
  try {
    const post = new Post({
      title,
      content,
      author: req.user._id // Utilise l'ID de l'utilisateur connecté
    });
    await post.save();
    console.log('Publication créée:', post);
    res.status(201).json(post);
  } catch (error) {
    console.error('Erreur lors de la création:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour récupérer toutes les publications (optionnel : protégée ou publique)
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
      const post = await Post.findById(req.params.id);
      if (!post) return res.status(404).json({ message: 'Publication non trouvée' });
      res.status(200).json(post);
    } catch (error) {
      console.error('Erreur lors de la récupération:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });
module.exports = router;