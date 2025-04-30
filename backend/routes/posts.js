const express = require('express');
const router = express.Router();
const Post = require('../Models/Post');
const Notification = require('../Models/Notification');
const passport = require('../routes/passportConfig');
const multer = require('multer');
const path = require('path');
const axios = require('axios'); // Add axios for HTTP requests
const { checkAndAwardBadges } = require('../utils/badgeUtils'); // Fixed the import path
const InappropriateComment = require('../Models/InappropriateComment');
const mongoose = require('mongoose');
const { transporter } = require('../config/emailConfig');
const User = require('../Models/Users');

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
      // Appeler l'API Flask pour analyser le contenu
      const flaskResponse = await axios.post('http://127.0.0.1:5011/api/analyze', {
        text: `${title} ${content}`,
      });

      const analysis = flaskResponse.data;
      console.log('Analyse du contenu:', analysis);

      // Vérifier si le contenu est inapproprié ou indique de la détresse
      if (analysis.is_inappropriate) {
        return res.status(400).json({ message: 'Contenu inapproprié détecté. Veuillez modifier votre publication.' });
      }

      if (analysis.is_distress) {
        // Vous pouvez ajouter une logique ici, comme enregistrer un indicateur de détresse
        console.log('Détresse détectée dans la publication.');
      }

      const post = new Post({
        title,
        content,
        author: req.user._id,
        isAnonymous: isAnonymous || false,
        anonymousPseudo: isAnonymous ? generateAnonymousPseudo() : null,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
        tags: tags ? JSON.parse(tags) : [],
         // Optionnel : enregistrer le score de détresse
      });
      await post.save();

      // Vérifier les badges après avoir publié
      const { newBadge } = await checkAndAwardBadges(req.user._id);

      // Appeler l'API de recommandation (si nécessaire)
      try {
        await axios.post('http://localhost:5010/api/recommend', {
          post_id: post._id.toString(),
        });
        console.log(`Requête de recommandation envoyée pour le post ${post._id}`);
      } catch (error) {
        console.error('Erreur lors de l\'appel à l\'API de recommandation:', error.message);
      }

      res.status(201).json({ post, newBadge });
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
);

// Route pour récupérer toutes les publications
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().populate('author', 'Name badges'); // Include badges in populate
    console.log('Publications récupérées:', posts);
    res.status(200).json(posts);
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route to delete a post
router.delete('/:id', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Publication non trouvée' });
    }

    // Check if the authenticated user is the author of the post
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à supprimer cette publication" });
    }

    // Delete the post
    await Post.deleteOne({ _id: req.params.id });

    // Delete associated notifications (e.g., likes, comments)
    await Notification.deleteMany({ post: req.params.id });

    // Fetch the updated list of posts to return to the frontend
    const updatedPosts = await Post.find()
      .populate('author', 'Name badges')
      .populate('comments.author', 'Name badges');

    res.status(200).json({ message: 'Publication supprimée avec succès', posts: updatedPosts });
  } catch (error) {
    console.error('Erreur lors de la suppression de la publication:', error);
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
        tagCounts[tag] = (tagCounts[tag] || 0) + (engagement > 0 ? engagement : 1);
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

// Route pour récupérer tous les posts pour l'admin
router.get('/admin', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    // Vérifier si l'utilisateur est admin
    if (!req.user.Role || !req.user.Role.includes('admin')) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Récupérer tous les posts avec les informations des auteurs
    const posts = await Post.find()
      .populate('author', 'Name Email Identifiant Role enabled imageUrl')
      .sort({ createdAt: -1 }); // Trier du plus récent au plus ancien

    // Format posts to include user enabled status
    const postsWithUserStatus = posts.map(post => {
      const postObj = post.toObject();
      
      // Ensure we have author information even if it's anonymous
      if (postObj.isAnonymous) {
        postObj.anonymousDetails = {
          pseudonym: postObj.anonymousPseudo || 'Anonyme'
        };
      }
      
      // Add user status information if author exists
      if (postObj.author) {
        // Using the user's enabled status, not the post's
        postObj.userEnabled = postObj.author.enabled !== undefined ? postObj.author.enabled : true;
      }
      
      return postObj;
    });

    res.status(200).json(postsWithUserStatus);
  } catch (error) {
    console.error('Erreur lors de la récupération des posts pour admin:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'Name badges') // Include badges in populate
      .populate('comments.author', 'Name badges'); // Include badges for comment authors
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
          recipient: post.author,
          sender: userId,
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

    // Vérifier les badges après avoir liké
    const { newBadge } = await checkAndAwardBadges(userId);

    const updatedPost = await Post.findById(req.params.id)
      .populate('author', 'Name badges')
      .populate('comments.author', 'Name badges');
    console.log('Post mis à jour:', updatedPost);
    res.status(200).json({ post: updatedPost, newBadge });
  } catch (error) {
    console.error('Erreur lors du like:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour ajouter un commentaire
// Update your existing comment post route

router.post('/:id/comments', passport.authenticate('jwt', { session: false }), async (req, res) => {
  const { content, isAnonymous } = req.body;

  try {
    // First check if the user is enabled
    if (!req.user.enabled) {
      return res.status(403).json({ message: 'Votre compte est désactivé. Veuillez contacter l\'administrateur.' });
    }

    const post = await Post.findById(req.params.id).populate('comments.author', 'Name Email badges');
    if (!post) {
      return res.status(404).json({ message: 'Publication non trouvée' });
    }

    // Check if content is inappropriate using Flask API
    const flaskResponse = await axios.post('http://127.0.0.1:5011/api/analyze', {
      text: content,
    });

    const analysis = flaskResponse.data;
    
    // Check if the content is inappropriate
    if (analysis.is_inappropriate) {
      // Create an inappropriate comment record even if not posted
      const inappropriateComment = new InappropriateComment({
        content: content,
        author: req.user._id,
        postId: post._id,
        postTitle: post.title,
        reason: analysis.reason || 'Contenu inapproprié détecté'
      });
      
      await inappropriateComment.save();
      
      // Increment user's strike count
      req.user.inappropriateCommentsCount = (req.user.inappropriateCommentsCount || 0) + 1;
      req.user.lastInappropriateComment = new Date();
      
      // Check if user has reached 3 strikes
      if (req.user.inappropriateCommentsCount >= 3) {
        req.user.enabled = false;
        await req.user.save();

        // Send email notification to admin
  try {
    // Find admin users
    const adminUsers = await User.find({ Role: { $in: ['admin'] } }, { Email: 1 });
    
    if (adminUsers && adminUsers.length > 0) {
      const adminEmails = adminUsers.map(admin => admin.Email);
      
      const mailOptions = {
        from: `"UniMindCare System" <${process.env.EMAIL_USER}>`,
        to: adminEmails.join(','),
        subject: `🚨 Compte utilisateur désactivé - ${req.user.Name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #d32f2f;">Compte utilisateur désactivé</h2>
            <p>Un compte utilisateur a été automatiquement désactivé pour violation des règles communautaires:</p>
            <ul style="background: #f5f5f5; padding: 15px; border-radius: 4px;">
              <li><strong>Nom:</strong> ${req.user.Name}</li>
              <li><strong>Email:</strong> ${req.user.Email}</li>
              <li><strong>Identifiant:</strong> ${req.user.Identifiant}</li>
              <li><strong>Raison:</strong> 3 commentaires inappropriés</li>
              <li><strong>Dernier commentaire:</strong> "${content}"</li>
              <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
            </ul>
             <p>Vous pouvez réactiver ce compte depuis le panneau d'administration si nécessaire.</p>
            <a href="http://localhost:3000/blog-admin" style="background: #1976d2; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">Accéder au panneau admin</a>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email de notification envoyé aux administrateurs pour l'utilisateur désactivé: ${req.user._id}`);
    }
  } catch (emailError) {
    console.error('Erreur lors de l\'envoi de l\'email de notification:', emailError);
    // Continue execution - don't block the response due to email error
  }
        
        return res.status(403).json({ 
          message: 'Votre compte a été désactivé après 3 commentaires inappropriés.',
          strikes: req.user.inappropriateCommentsCount
        });
      }
      
      await req.user.save();
      
      // Warn the user about their strikes
      return res.status(400).json({ 
        message: `Commentaire inapproprié détecté. Attention: ${req.user.inappropriateCommentsCount}/3 avertissements.`,
        strikes: req.user.inappropriateCommentsCount
      });
    }

    // Generate a unique ID for the comment (MongoDB will do this automatically)
    const commentId = new mongoose.Types.ObjectId();

    // Create the new comment with explicit ID
    const newComment = {
      _id: commentId, // Explicitly set the ID
      content,
      author: req.user._id,
      isAnonymous: isAnonymous || false,
      anonymousPseudo: isAnonymous ? generateAnonymousPseudo() : null,
      createdAt: new Date(),
      likes: [],
      dislikes: [],
      isInappropriate: false,
      flagReason: '',
      flaggedAt: null
    };

    post.comments.push(newComment);
    await post.save();

    // CREATE NOTIFICATION FOR POST AUTHOR - THIS WAS MISSING
    // Only send notification if commenter is not the post author
    if (post.author.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        recipient: post.author,
        sender: req.user._id,
        type: 'comment',
        post: post._id,
        comment: commentId,
        isAnonymous: isAnonymous || false,
        anonymousPseudo: isAnonymous ? newComment.anonymousPseudo : null,
      });
      await notification.save();
      console.log('Notification created for new comment:', notification);

      // Send WebSocket notification to post author
      const populatedNotification = await Notification.findById(notification._id)
        .populate('sender', 'Name')
        .populate('post', 'title');
      req.io.to(post.author.toString()).emit('new_notification', populatedNotification);
      console.log(`WebSocket notification sent to ${post.author.toString()}`);
    }

    // Get the updated post WITH POPULATED AUTHOR data
    const updatedPost = await Post.findById(req.params.id)
      .populate('author', 'Name badges')
      .populate('comments.author', 'Name badges');

    // Get the newly created comment from the populated post
    const createdComment = updatedPost.comments.find(comment => 
      comment._id.toString() === commentId.toString()
    );

    console.log('New comment created with ID:', createdComment._id);

    // Check if user earned any badges
    const { newBadge } = await checkAndAwardBadges(req.user._id);

    res.status(201).json({ 
      post: updatedPost,
      newBadge,
      comment: createdComment // Return the specific comment that was created
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du commentaire:', error);
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

    // Vérifier les badgesphysics à jour pour les badges
    const { newBadge } = await checkAndAwardBadges(userId);

    const updatedPost = await Post.findById(req.params.postId)
      .populate('author', 'Name badges')
      .populate('comments.author', 'Name badges');
    res.status(200).json({ post: updatedPost, newBadge });
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
          recipient: comment.author,
          sender: userId,
          type: 'dislike_comment',
          post: post._id,
          comment: comment._id,
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

    // Vérifier les badges après avoir disliké un commentaire
    const { newBadge } = await checkAndAwardBadges(userId);

    const updatedPost = await Post.findById(req.params.postId)
      .populate('author', 'Name badges')
      .populate('comments.author', 'Name badges');
    res.status(200).json({ post: updatedPost, newBadge });
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
      .populate('author', 'Name badges')
      .populate('comments.author', 'Name badges');
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error('Erreur lors de la suppression du commentaire:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});



// Add this route after the other existing routes

// Route pour récupérer tous les posts pour l'admin




module.exports = router;