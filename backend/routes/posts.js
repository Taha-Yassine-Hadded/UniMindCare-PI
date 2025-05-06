const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Notification = require('../Models/Notification');
const passport = require('../routes/passportConfig');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const { checkAndAwardBadges } = require('../utils/badgeUtils');
const InappropriateComment = require('../Models/InappropriateComment');
const mongoose = require('mongoose');
const { transporter } = require('../config/emailConfig');
const User = require('../Models/Users');
const validator = require('validator');

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'Uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({ storage });

// Generate anonymous pseudonym
const generateAnonymousPseudo = () => `Anonyme${Math.floor(Math.random() * 1000)}`;

// POST / - Create a post
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  upload.single('image'),
  async (req, res) => {
    try {
      const { title, content, isAnonymous, tags } = req.body;
      if (!validator.isLength(title, { min: 1 }) || !validator.isLength(content, { min: 1 })) {
        return res.status(400).json({ message: 'Titre et contenu requis' });
      }

      const flaskResponse = await axios.post('http://127.0.0.1:5011/api/analyze', {
        text: `${title} ${content}`,
      });
      const analysis = flaskResponse.data;

      if (analysis.is_inappropriate) {
        return res.status(400).json({ message: 'Contenu inapproprié détecté' });
      }

      const post = new Post({
        title,
        content,
        author: req.user._id,
        isAnonymous: isAnonymous || false,
        anonymousPseudo: isAnonymous ? generateAnonymousPseudo() : null,
        imageUrl: req.file ? `/Uploads/${req.file.filename}` : null,
        tags: tags ? JSON.parse(tags) : [], // Synchronous
        isDistress: analysis.is_distress || false,
        distressScore: analysis.is_distress ? (analysis.distress || 0.85) : 0,
      });

      await post.save();
      const { newBadge } = await checkAndAwardBadges(req.user._id);

      try {
        await axios.post('http://127.0.0.1:5010/api/recommend', { post_id: post._id.toString() });
      } catch (error) {
        console.error('Erreur API recommandation:', error.message);
      }

      res.status(201).json({ post, newBadge });
    } catch (error) {
      console.error('Erreur création post:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
);

// GET / - Get all posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().populate('author', 'Name badges');
    res.status(200).json(posts);
  } catch (error) {
    console.error('Erreur récupération posts:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// DELETE /:id - Delete a post
router.delete('/:id', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Publication non trouvée' });
    }
    if (post.author.toString() !== req.user._id.toString()) { // Synchronous
      return res.status(403).json({ message: 'Non autorisé' });
    }

    await Post.deleteOne({ _id: req.params.id });
    await Notification.deleteMany({ post: req.params.id });

    const updatedPosts = await Post.find()
      .populate('author', 'Name badges')
      .populate('comments.author', 'Name badges');
    res.status(200).json({ message: 'Publication supprimée', posts: updatedPosts });
  } catch (error) {
    console.error('Erreur suppression post:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /stats - Get post statistics
router.get('/stats', async (req, res) => {
  try {
    const posts = await Post.find();
    const stats = computePostStats(posts);
    res.json(stats);
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Helper function to compute stats
function computePostStats(posts) {
  const totalPosts = posts.length;
  const totalComments = posts.reduce((acc, post) => acc + (post.comments?.length || 0), 0);
  const totalLikes = posts.reduce((acc, post) => acc + (post.likes?.length || 0), 0);
  const avgCommentsPerPost = totalPosts > 0 ? Number((totalComments / totalPosts).toFixed(2)) : 0;

  const mostVisitedPosts = posts
    .sort((a, b) => b.views - a.views)
    .slice(0, 3)
    .map(post => ({ id: post._id, title: post.title, views: post.views }));

  const mostEngagingPosts = posts
    .map(post => ({
      id: post._id,
      title: post.title,
      engagement: (post.likes?.length || 0) + (post.comments?.length || 0),
      tags: post.tags || [],
    }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 3);

  const mostCommentedPosts = posts
    .sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0))
    .slice(0, 3)
    .map(post => ({ id: post._id, title: post.title, commentCount: post.comments?.length || 0 }));

  const popularTags = computePopularTags(posts);

  return {
    totalPosts,
    totalComments,
    totalLikes,
    avgCommentsPerPost,
    mostVisitedPosts,
    mostEngagingPosts,
    mostCommentedPosts,
    popularTags,
    totalEngagement: popularTags.reduce((sum, tag) => sum + tag.engagement, 0),
  };
}

// Helper function to compute popular tags
function computePopularTags(posts) {
  const tagCounts = {};
  let totalEngagement = 0;

  posts.forEach(post => {
    const engagement = Math.max((post.likes?.length || 0) + (post.comments?.length || 0), 1);
    totalEngagement += engagement;

    if (!post.tags || post.tags.length === 0) {
      tagCounts['Autre'] = (tagCounts['Autre'] || 0) + engagement;
    } else {
      post.tags.forEach(tag => {
        const normalizedTag = tag.toLowerCase() === 'autre' ? 'Autre' : tag;
        tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + engagement; // Synchronous
      });
    }
  });

  return Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, engagement]) => ({
      tag,
      engagement,
      percentage: Math.round((engagement / totalEngagement) * 100), // Synchronous
    }));
}

// GET /admin - Get all posts for admin
router.get('/admin', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.user.Role || !req.user.Role.includes('admin')) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const posts = await Post.find()
      .populate('author', 'Name Email Identifiant Role enabled imageUrl')
      .sort({ createdAt: -1 });

    const postsWithUserStatus = posts.map(post => {
      const postObj = post.toObject();
      if (postObj.isAnonymous) {
        postObj.anonymousDetails = { pseudonym: postObj.anonymousPseudo || 'Anonyme' };
      }
      if (postObj.author) {
        postObj.userEnabled = postObj.author.enabled !== undefined ? postObj.author.enabled : true;
      }
      return postObj;
    });

    res.status(200).json(postsWithUserStatus);
  } catch (error) {
    console.error('Erreur récupération admin posts:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /admin/stress-detected - Get distress posts
router.get('/admin/stress-detected', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.user.Role || !req.user.Role.includes('admin')) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const distressPosts = await Post.find({ isDistress: true })
      .populate('author', 'Name Email Identifiant Role enabled imageUrl')
      .sort({ createdAt: -1 });

    const postsWithRealAuthor = distressPosts.map(post => {
      const postObj = post.toObject();
      if (post.author) {
        postObj.realAuthor = { name: post.author.Name, email: post.author.Email, id: post.author._id };
      }
      return postObj;
    });

    res.status(200).json(postsWithRealAuthor);
  } catch (error) {
    console.error('Erreur récupération distress posts:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /admin/alert-psychologists/:postId - Alert psychologists
router.post('/admin/alert-psychologists/:postId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.user.Role || !req.user.Role.includes('admin')) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    if (!validator.isMongoId(req.params.postId)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    const post = await Post.findById(req.params.postId).populate('author', 'Name Email');
    if (!post) {
      return res.status(404).json({ message: 'Publication non trouvée' });
    }

    const psychologists = await User.find({ Role: { $in: ['psychiatre'] } });
    if (psychologists.length === 0) {
      return res.status(404).json({ message: 'Aucun psychiatre trouvé' });
    }

    const psychologistList = psychologists
      .map(psych => `<li><strong>${psych.Name}</strong> - <a href="mailto:${psych.Email}">${psych.Email}</a></li>`)
      .join('');

    for (const psych of psychologists) {
      const mailOptions = {
        from: `"UniMindCare Alert" <${process.env.EMAIL_USER}>`,
        to: psych.Email,
        subject: '⚠️ ALERTE: Détection de détresse',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #d32f2f;">Alerte de détresse détectée</h2>
            <p>Cher(e) ${psych.Name},</p>
            <p>Détresse détectée dans une publication:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <p><strong>Auteur:</strong> ${post.isAnonymous ? 'Anonyme' : post.author?.Name || 'Inconnu'}</p>
              <p><strong>Email:</strong> ${post.isAnonymous ? 'Protégé' : post.author?.Email || 'Non disponible'}</p>
              <p><strong>Titre:</strong> ${post.title}</p>
              <p><strong>Extrait:</strong><br>${post.content.substring(0, 200)}...</p>
              <p><strong>Date:</strong> ${new Date(post.createdAt).toLocaleString()}</p>
            </div>
            <a href="http://localhost:3000/blog/${post._id}" style="background: #1976d2; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">Voir la publication</a>
            <p style="margin-top: 20px;">Cordialement,<br>L'équipe UniMindCare</p>
          </div>
        `,
      };
      await transporter.sendMail(mailOptions);
    }

    if (post.author && post.author.Email) {
      const userMailOptions = {
        from: `"UniMindCare Support" <${process.env.EMAIL_USER}>`,
        to: post.author.Email,
        subject: 'UniMindCare - Soutien santé mentale',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #1976d2; text-align: center;">Nous sommes là pour vous</h2>
            <p>Bonjour ${post.author.Name},</p>
            <p>Nous avons détecté une possible détresse dans votre publication <strong>"${post.title}"</strong>.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1976d2;">Conseils:</h3>
              <ul style="padding-left: 20px; line-height: 1.6;">
                <li><strong>Parlez</strong> - À un ami ou un professionnel.</li>
                <li><strong>Prenez soin</strong> - Dormez, mangez équilibré, faites de l'exercice.</li>
                <li><strong>Méditez</strong> - La pleine conscience réduit l'anxiété.</li>
                <li><strong>Limitez les infos</strong> - Pause réseaux sociaux.</li>
                <li><strong>Routine</strong> - Structurez vos journées.</li>
              </ul>
            </div>
            <p>Consultez nos psychologues gratuitement via la plateforme.</p>
            <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px;">
              <h3 style="color: #0d6efd;">Psychologues:</h3>
              <ul style="padding-left: 20px;">${psychologistList}</ul>
            </div>
            <p>Urgence: <strong>0800 32123</strong> ou <strong>S.O.S Amitié: 09 72 39 40 50</strong></p>
            <p style="margin-top: 25px;">Prenez soin de vous,<br>L'équipe UniMindCare</p>
          </div>
        `,
      };
      await transporter.sendMail(userMailOptions);
    }

    post.distressAlerted = true;
    post.distressAlertedAt = new Date();
    await post.save();

    res.status(200).json({
      message: `Alerte envoyée à ${psychologists.length} psychiatre(s) et à l'utilisateur`,
      alertedAt: post.distressAlertedAt,
    });
  } catch (error) {
    console.error('Erreur envoi alertes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /recommend - Placeholder for recommendations
router.post('/recommend', (req, res) => {
  res.status(200).json({ message: 'Recommandations en cours' });
});

// GET /:id - Get a post
router.get('/:id', async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }
    const post = await Post.findById(req.params.id)
      .populate('author', 'Name badges')
      .populate('comments.author', 'Name badges');
    if (!post) return res.status(404).json({ message: 'Publication non trouvée' });

    post.views += 1;
    await post.save();
    res.status(200).json(post);
  } catch (error) {
    console.error('Erreur récupération post:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /:id/like - Like a post
router.post('/:id/like', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Publication non trouvée' });

    const userId = req.user._id;
    let notification;
    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
    } else {
      post.likes.push(userId);
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
        const populatedNotification = await Notification.findById(notification._id)
          .populate('sender', 'Name')
          .populate('post', 'title');
        req.io.to(post.author.toString()).emit('new_notification', populatedNotification);
      }
    }

    await post.save();
    const { newBadge } = await checkAndAwardBadges(userId);
    const updatedPost = await Post.findById(req.params.id)
      .populate('author', 'Name badges')
      .populate('comments.author', 'Name badges');
    res.status(200).json({ post: updatedPost, newBadge });
  } catch (error) {
    console.error('Erreur like post:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /:id/comments - Add a comment
router.post('/:id/comments', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { content, isAnonymous } = req.body;
    if (!validator.isMongoId(req.params.id) || !validator.isLength(content, { min: 1 })) {
      return res.status(400).json({ message: 'ID ou contenu invalide' });
    }
    if (!req.user.enabled) {
      return res.status(403).json({ message: 'Compte désactivé' });
    }

    const post = await Post.findById(req.params.id).populate('comments.author', 'Name Email badges');
    if (!post) return res.status(404).json({ message: 'Publication non trouvée' });

    const flaskResponse = await axios.post('http://127.0.0.1:5011/api/analyze', { text: content });
    const analysis = flaskResponse.data;

    if (analysis.is_inappropriate) {
      const inappropriateComment = new InappropriateComment({
        content,
        author: req.user._id,
        postId: post._id,
        postTitle: post.title,
        reason: analysis.reason || 'Contenu inapproprié',
      });
      await inappropriateComment.save();

      req.user.inappropriateCommentsCount = (req.user.inappropriateCommentsCount || 0) + 1;
      req.user.lastInappropriateComment = new Date();

      if (req.user.inappropriateCommentsCount >= 3) {
        req.user.enabled = false;
        await req.user.save();
        await notifyAdminsOfUserDisable(req.user);
        return res.status(403).json({
          message: 'Compte désactivé après 3 commentaires inappropriés',
          strikes: req.user.inappropriateCommentsCount,
        });
      }

      await req.user.save();
      return res.status(400).json({
        message: `Commentaire inapproprié. Avertissement: ${req.user.inappropriateCommentsCount}/3`,
        strikes: req.user.inappropriateCommentsCount,
      });
    }

    const commentId = new mongoose.Types.ObjectId();
    const newComment = {
      _id: commentId,
      content,
      author: req.user._id,
      isAnonymous: isAnonymous || false,
      anonymousPseudo: isAnonymous ? generateAnonymousPseudo() : null,
      createdAt: new Date(),
      likes: [],
      dislikes: [],
      isInappropriate: false,
      flagReason: '',
      flaggedAt: null,
    };

    post.comments.push(newComment); // Synchronous
    await post.save();

    let notification;
    if (post.author.toString() !== req.user._id.toString()) {
      notification = new Notification({
        recipient: post.author,
        sender: req.user._id,
        type: 'comment',
        post: post._id,
        comment: commentId,
        isAnonymous: isAnonymous || false,
        anonymousPseudo: isAnonymous ? newComment.anonymousPseudo : null,
      });
      await notification.save();
      const populatedNotification = await Notification.findById(notification._id)
        .populate('sender', 'Name')
        .populate('post', 'title');
      req.io.to(post.author.toString()).emit('new_notification', populatedNotification);
    }

    const updatedPost = await Post.findById(req.params.id)
      .populate('author', 'Name badges')
      .populate('comments.author', 'Name badges');
    const createdComment = updatedPost.comments.find(comment => comment._id.toString() === commentId.toString());

    const { newBadge } = await checkAndAwardBadges(req.user._id);
    res.status(201).json({ post: updatedPost, newBadge, comment: createdComment });
  } catch (error) {
    console.error('Erreur ajout commentaire:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Helper function to notify admins
async function notifyAdminsOfUserDisable(user) {
  try {
    const adminUsers = await User.find({ Role: { $in: ['admin'] } }, { Email: 1 });
    if (adminUsers.length === 0) return;

    const adminEmails = adminUsers.map(admin => admin.Email);
    const mailOptions = {
      from: `"UniMindCare System" <${process.env.EMAIL_USER}>`,
      to: adminEmails.join(','),
      subject: `🚨 Compte désactivé - ${user.Name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #d32f2f;">Compte désactivé</h2>
          <p>Compte désactivé pour violation des règles:</p>
          <ul style="background: #f5f5f5; padding: 15px; border-radius: 4px;">
            <li><strong>Nom:</strong> ${user.Name}</li>
            <li><strong>Email:</strong> ${user.Email}</li>
            <li><strong>Identifiant:</strong> ${user.Identifiant}</li>
            <li><strong>Raison:</strong> 3 commentaires inappropriés</li>
            <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <a href="http://localhost:3000/blog-admin" style="background: #1976d2; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">Panneau admin</a>
        </div>
      `,
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Erreur envoi notification admin:', error);
  }
}

// POST /:postId/comments/:commentId/like - Like a comment
router.post('/:postId/comments/:commentId/like', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.postId) || !validator.isMongoId(req.params.commentId)) {
      return res.status(400).json({ message: 'ID invalide' });
    }
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Publication non trouvée' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Commentaire non trouvé' });

    const userId = req.user._id;
    if (comment.likes.includes(userId)) {
      comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
    } else {
      comment.likes.push(userId);
      comment.dislikes = comment.dislikes.filter(id => id.toString() !== userId.toString());
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
        const populatedNotification = await Notification.findById(notification._id)
          .populate('sender', 'Name')
          .populate('post', 'title');
        req.io.to(comment.author.toString()).emit('new_notification', populatedNotification);
      }
    }

    await post.save();
    const { newBadge } = await checkAndAwardBadges(userId);
    const updatedPost = await Post.findById(req.params.postId)
      .populate('author', 'Name badges')
      .populate('comments.author', 'Name badges');
    res.status(200).json({ post: updatedPost, newBadge });
  } catch (error) {
    console.error('Erreur like commentaire:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /:postId/comments/:commentId/dislike - Dislike a comment
router.post('/:postId/comments/:commentId/dislike', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.postId) || !validator.isMongoId(req.params.commentId)) {
      return res.status(400).json({ message: 'ID invalide' });
    }
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Publication non trouvée' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Commentaire non trouvé' });

    const userId = req.user._id;
    if (comment.dislikes.includes(userId)) {
      comment.dislikes = comment.dislikes.filter(id => id.toString() !== userId.toString());
    } else {
      comment.dislikes.push(userId);
      comment.likes = comment.likes.filter(id => id.toString() !== userId.toString());
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
        const populatedNotification = await Notification.findById(notification._id)
          .populate('sender', 'Name')
          .populate('post', 'title');
        req.io.to(comment.author.toString()).emit('new_notification', populatedNotification);
      }
    }

    await post.save();
    const { newBadge } = await checkAndAwardBadges(userId);
    const updatedPost = await Post.findById(req.params.postId)
      .populate('author', 'Name badges')
      .populate('comments.author', 'Name badges');
    res.status(200).json({ post: updatedPost, newBadge });
  } catch (error) {
    console.error('Erreur dislike commentaire:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// DELETE /:postId/comments/:commentId - Delete a comment
router.delete('/:postId/comments/:commentId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.postId) || !validator.isMongoId(req.params.commentId)) {
      return res.status(400).json({ message: 'ID invalide' });
    }
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Publication non trouvée' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Commentaire non trouvé' });
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    post.comments = post.comments.filter(c => c._id.toString() !== req.params.commentId);
    await post.save();

    const updatedPost = await Post.findById(req.params.postId)
      .populate('author', 'Name badges')
      .populate('comments.author', 'Name badges');
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error('Erreur suppression commentaire:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;