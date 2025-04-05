// routes/posts.js
const express = require('express');
const router = express.Router();
const Post = require('../Models/Post');
const Notification = require('../Models/Notification');
const passport = require('../routes/passportConfig');
const multer = require('multer');
const path = require('path');

// Configuration de multer pour stocker les images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Fonction pour générer un pseudo anonyme
const generateAnonymousPseudo = () => {
  const randomNum = Math.floor(Math.random() * 1000);
  return `Anonyme${randomNum}`;
};

// Route pour ajouter une publication avec ou sans image
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  upload.single('image'),
  async (req, res) => {
    const { title, content, isAnonymous } = req.body;

    try {
      const post = new Post({
        title,
        content,
        author: req.user._id,
        isAnonymous: isAnonymous || false,
        anonymousPseudo: isAnonymous ? generateAnonymousPseudo() : null,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
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
    const posts = await Post.find().populate('author', 'Name');
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
      .populate('author', 'Name')
      .populate('comments.author');
    if (!post) return res.status(404).json({ message: 'Publication non trouvée' });
    res.status(200).json(post);
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour liker une publication
router.post('/:id/like', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    console.log(`Requête de like reçue pour le post ${req.params.id} par l'utilisateur ${req.user._id}`);
    const post = await Post.findById(req.params.id);
    if (!post) {
      console.log('Publication non trouvée');
      return res.status(404).json({ message: 'Publication non trouvée' });
    }

    const userId = req.user._id;

    let notification;
    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
      console.log(`Like retiré pour le post ${post._id}`);
    } else {
      post.likes.push(userId);
      console.log(`Like ajouté pour le post ${post._id}`);

      // Créer une notification pour l'auteur de la publication (sauf si c'est l'utilisateur lui-même)
      if (post.author.toString() !== userId.toString()) {
        notification = new Notification({
          recipient: post.author,
          sender: userId,
          type: 'like_post',
          post: post._id,
          isAnonymous: false, // Les likes ne sont pas anonymes
        });
        await notification.save();
      }
    }

    await post.save();
    const updatedPost = await Post.findById(req.params.id)
      .populate('author', 'Name')
      .populate('comments.author');
    console.log('Post mis à jour:', updatedPost);
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error('Erreur lors du like:', error);
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

    // Créer une notification pour l'auteur de la publication (sauf si c'est l'utilisateur lui-même)
    if (post.author.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        recipient: post.author,
        sender: req.user._id,
        type: 'comment',
        post: post._id,
        comment: comment._id,
        isAnonymous: isAnonymous || false,
        anonymousPseudo: isAnonymous ? comment.anonymousPseudo : null,
      });
      await notification.save();
    }

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

    if (comment.likes.includes(userId)) {
      comment.likes = comment.likes.filter((id) => id.toString() !== userId.toString());
    } else {
      comment.likes.push(userId);
      comment.dislikes = comment.dislikes.filter((id) => id.toString() !== userId.toString());

      // Créer une notification pour l'auteur du commentaire (sauf si c'est l'utilisateur lui-même)
      if (comment.author.toString() !== userId.toString()) {
        const notification = new Notification({
          recipient: comment.author,
          sender: userId,
          type: 'like_comment',
          post: post._id,
          comment: comment._id,
          isAnonymous: false, // Les likes ne sont pas anonymes
        });
        await notification.save();
      }
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
// Route to dislike a comment
router.post('/:postId/comments/:commentId/dislike', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Publication non trouvée' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Commentaire non trouvé' });

    const userId = req.user._id;

    if (comment.dislikes.includes(userId)) {
      comment.dislikes = comment.dislikes.filter((id) => id.toString() !== userId.toString());
    } else {
      comment.dislikes.push(userId);
      comment.likes = comment.likes.filter((id) => id.toString() !== userId.toString());

      // Créer une notification pour l'auteur du commentaire (sauf si c'est l'utilisateur lui-même)
      if (comment.author.toString() !== userId.toString()) {
        const notification = new Notification({
          recipient: comment.author,
          sender: userId,
          type: 'dislike_comment',
          post: post._id,
          comment: comment._id,
          isAnonymous: false, // Les dislikes ne sont pas anonymes
        });
        await notification.save();
      }
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

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à supprimer ce commentaire" });
    }

    post.comments = post.comments.filter((c) => c._id.toString() !== req.params.commentId);

    await post.save();

    const updatedPost = await Post.findById(req.params.postId)
      .populate('author', 'Name')
      .populate('comments.author');
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error('Erreur lors de la suppression du commentaire:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;