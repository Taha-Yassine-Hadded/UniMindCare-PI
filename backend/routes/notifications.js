// routes/notifications.js
const express = require('express');
const router = express.Router();
const Notification = require('../Models/Notification');
const passport = require('../routes/passportConfig');

// Récupérer les notifications de l'utilisateur connecté
router.get('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    console.log('Utilisateur connecté pour GET /notifications:', req.user);
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'Name')
      .populate('post', 'title')
      .sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Marquer une notification comme lue
router.put('/:id/read', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    console.log('Requête PUT /:id/read reçue pour notification ID:', req.params.id);
    console.log('Utilisateur connecté:', req.user);

    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      console.log('Notification non trouvée:', req.params.id);
      return res.status(404).json({ message: 'Notification non trouvée' });
    }

    console.log('Destinataire de la notification:', notification.recipient);
    console.log('ID utilisateur connecté:', req.user._id);
    if (notification.recipient.toString() !== req.user._id.toString()) {
      console.log('Utilisateur non autorisé à modifier cette notification');
      return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à modifier cette notification' });
    }

    notification.read = true;
    await notification.save();
    console.log('Notification mise à jour avec succès:', notification);
    res.status(200).json(notification);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la notification:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;