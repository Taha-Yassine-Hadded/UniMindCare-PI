// routes/posts.js
const express = require('express');
const router = express.Router();
const Post = require('../Models/Post');
const passport = require('../routes/passportConfig');
const multer = require('multer');
const path = require('path');

// Configuration de multer pour stocker les images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Dossier où les images seront stockées
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nom unique avec timestamp
  }
});

const upload = multer({ storage: storage });

// Fonction pour générer un pseudo anonyme
const generateAnonymousPseudo = () => {
  const randomNum = Math.floor(Math.random() * 1000); // Nombre aléatoire entre 0 et 999
  return `Anonyme${randomNum}`;
};

// Route pour ajouter une publication avec ou sans image
router.post('/', 
  passport.authenticate('jwt', { session: false }), 
  upload.single('image'), // 'image' est le nom du champ dans le formulaire
  async (req, res) => {
    const { title, content, isAnonymous } = req.body;

    try {
      const post = new Post({
        title,
        content,
        author: req.user._id,
        isAnonymous: isAnonymous || false,
        anonymousPseudo: isAnonymous ? generateAnonymousPseudo() : null,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null // URL de l'image si présente
      });
      await post.save();
      res.status(201).json(post);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
);

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
      .populate('comments.author'); // Peupler les auteurs des commentaires avec tous les champs
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

// Route to like a comment
router.post('/:postId/comments/:commentId/like', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Publication non trouvée' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Commentaire non trouvé' });

    const userId = req.user._id;

    // Check if user already liked
    if (comment.likes.includes(userId)) {
      // Remove like if already liked
      comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
    } else {
      // Add like and remove dislike if exists
      comment.likes.push(userId);
      comment.dislikes = comment.dislikes.filter(id => id.toString() !== userId.toString());
    }

    await post.save();
    const updatedPost = await Post.findById(req.params.postId)
      .populate('author', 'Name')
      .populate('comments.author', 'Name');
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error('Erreur lors du like:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route to dislike a comment
router.post('/:postId/comments/:commentId/dislike', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Publication non trouvée' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Commentaire non trouvé' });

    const userId = req.user._id;

    // Check if user already disliked
    if (comment.dislikes.includes(userId)) {
      // Remove dislike if already disliked
      comment.dislikes = comment.dislikes.filter(id => id.toString() !== userId.toString());
    } else {
      // Add dislike and remove like if exists
      comment.dislikes.push(userId);
      comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
    }

    await post.save();
    const updatedPost = await Post.findById(req.params.postId)
      .populate('author', 'Name')
      .populate('comments.author', 'Name');
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error('Erreur lors du dislike:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route to delete a comment
router.delete('/:postId/comments/:commentId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Publication non trouvée' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Commentaire non trouvé' });

    // Check if the user is the author of the comment
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à supprimer ce commentaire' });
    }

    // Remove the comment from the comments array
    post.comments = post.comments.filter(c => c._id.toString() !== req.params.commentId);

    await post.save();

    // Fetch the updated post with populated author data
    const updatedPost = await Post.findById(req.params.postId)
      .populate('author', 'Name')
      .populate('comments.author'); // Populate full author object
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error('Erreur lors de la suppression du commentaire:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;