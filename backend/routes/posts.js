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
    const { title, content, isAnonymous, tags } = req.body;

    try {
      const post = new Post({
        title,
        content,
        author: req.user._id,
        isAnonymous: isAnonymous || false,
        anonymousPseudo: isAnonymous ? generateAnonymousPseudo() : null,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
        tags: tags ? JSON.parse(tags) : [], // Les tags sont envoyés sous forme de tableau JSON
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


router.get('/stats', async (req, res) => {
  try {
    console.log('Début de la récupération des stats');
    const posts = await Post.find();
    console.log('Posts récupérés:', posts.length);
    const totalPosts = posts.length;
    console.log('Total posts:', totalPosts);
    const totalComments = posts.reduce((acc, post) => acc + (post.comments?.length || 0), 0);
    console.log('Total comments:', totalComments);
    const totalLikes = posts.reduce((acc, post) => acc + (post.likes?.length || 0), 0);
    console.log('Total likes:', totalLikes);
    const avgCommentsPerPost = totalPosts > 0 ? Number((totalComments / totalPosts).toFixed(2)) : 0;
    console.log('Moyenne commentaires par post:', avgCommentsPerPost);

    // Publications les plus visitées (Top 3)
    const mostVisitedPosts = posts
      .sort((a, b) => b.views - a.views)
      .slice(0, 3)
      .map(post => ({
        id: post._id,
        title: post.title,
        views: post.views,
      }));

    // Publications les plus engageantes (Top 3 par likes + commentaires)
    const mostEngagingPosts = posts
      .map(post => ({
        id: post._id,
        title: post.title,
        engagement: (post.likes?.length || 0) + (post.comments?.length || 0),
        tags: post.tags || [],
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 3);

    // Publications les plus commentées (Top 3)
    const mostCommentedPosts = posts
      .sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0))
      .slice(0, 3)
      .map(post => ({
        id: post._id,
        title: post.title,
        commentCount: post.comments?.length || 0,
      }));

    // Sujets les plus populaires (basé sur les tags de toutes les publications)
    const tagCounts = {};
    posts.forEach(post => {
      const engagement = (post.likes?.length || 0) + (post.comments?.length || 0);
      (post.tags || []).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + (engagement > 0 ? engagement : 1); // Ajouter 1 si engagement est 0
      });
    });
    const popularTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag, engagement]) => ({ tag, engagement }));

    res.json({
      totalPosts,
      totalComments,
      totalLikes,
      avgCommentsPerPost,
      mostVisitedPosts,
      mostEngagingPosts,
      mostCommentedPosts,
      popularTags,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des stats:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});


router.get('/by-tags', async (req, res) => {
  try {
    const tags = req.query.tags ? req.query.tags.split(',') : [];
    let posts;
    if (tags.length > 0) {
      posts = await Post.find({ tags: { $in: tags } }).populate('author', 'Name');
    } else {
      posts = await Post.find().populate('author', 'Name');
    }
    res.status(200).json(posts);
  } catch (error) {
    console.error('Erreur lors de la récupération par tags:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});



router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'Name')
      .populate('comments.author');
    if (!post) return res.status(404).json({ message: 'Publication non trouvée' });
    // Incrémenter le compteur de vues
    post.views += 1;
    await post.save();

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
          recipient: post.author, // Correct: Post author (e.g., "Baha")
          sender: userId, // User who liked the post (e.g., "Farah")
          type: 'like_post',
          post: post._id,
          isAnonymous: post.isAnonymous,
          anonymousPseudo: post.isAnonymous ? post.anonymousPseudo : null,
        });
        await notification.save();
        console.log('Notification créée pour like_post:', notification);

        // Émettre une notification via WebSocket au destinataire
        const populatedNotification = await Notification.findById(notification._id)
          .populate('sender', 'Name')
          .populate('post', 'title');
        req.io.to(post.author.toString()).emit('new_notification', populatedNotification);
        console.log(`Notification émise via WebSocket à ${post.author.toString()}`);
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
      likes: [],
      dislikes: [],
    };

    post.comments.push(comment);
    await post.save();

    // Récupérer l'ID du commentaire nouvellement créé
    const newComment = post.comments[post.comments.length - 1];

    // Créer une notification pour l'auteur de la publication (sauf si c'est l'utilisateur lui-même)
    if (post.author.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        recipient: post.author, // Correct: Post author (e.g., "Baha")
        sender: req.user._id, // User who commented (e.g., "Farah")
        type: 'comment',
        post: post._id,
        comment: newComment._id, // ID du commentaire (subdocument)
        isAnonymous: isAnonymous || false,
        anonymousPseudo: isAnonymous ? comment.anonymousPseudo : null,
      });
      await notification.save();
      console.log('Notification créée pour comment:', notification);

      // Émettre une notification via WebSocket
      const populatedNotification = await Notification.findById(notification._id)
        .populate('sender', 'Name')
        .populate('post', 'title');
      req.io.to(post.author.toString()).emit('new_notification', populatedNotification);
      console.log(`Notification émise via WebSocket à ${post.author.toString()}`);
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
          recipient: comment.author, // Correct: Comment author (e.g., "Baha")
          sender: userId, // User who liked the comment (e.g., "Farah")
          type: 'like_comment',
          post: post._id,
          comment: comment._id, // ID du commentaire (subdocument)
          isAnonymous: comment.isAnonymous,
          anonymousPseudo: comment.isAnonymous ? comment.anonymousPseudo : null,
        });
        await notification.save();
        console.log('Notification créée pour like_comment:', notification);

        // Émettre une notification via WebSocket
        const populatedNotification = await Notification.findById(notification._id)
          .populate('sender', 'Name')
          .populate('post', 'title');
        req.io.to(comment.author.toString()).emit('new_notification', populatedNotification);
        console.log(`Notification émise via WebSocket à ${comment.author.toString()}`);
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
          recipient: comment.author, // Correct: Comment author (e.g., "Baha")
          sender: userId, // User who disliked the comment (e.g., "Farah")
          type: 'dislike_comment',
          post: post._id,
          comment: comment._id, // ID du commentaire (subdocument)
          isAnonymous: comment.isAnonymous,
          anonymousPseudo: comment.isAnonymous ? comment.anonymousPseudo : null,
        });
        await notification.save();
        console.log('Notification créée pour dislike_comment:', notification);

        // Émettre une notification via WebSocket
        const populatedNotification = await Notification.findById(notification._id)
          .populate('sender', 'Name')
          .populate('post', 'title');
        req.io.to(comment.author.toString()).emit('new_notification', populatedNotification);
        console.log(`Notification émise via WebSocket à ${comment.author.toString()}`);
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