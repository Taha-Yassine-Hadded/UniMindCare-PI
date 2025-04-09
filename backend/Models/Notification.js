// Models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }, // Utilisateur qui reçoit la notification (étudiant, psychologue ou autre)
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }, // Utilisateur qui a déclenché la notification
  type: {
    type: String,
    enum: [
      // Types sociaux (premier modèle)
      'like_post',
      'like_comment',
      'dislike_comment',
      'comment',
      // Types de rendez-vous (deuxième modèle)
      'appointment_booked',
      'appointment_confirmed',
      'appointment_modified',
      'appointment_cancelled',
      'appointment_rejected',
    ],
    required: true,
  }, // Type de notification
  // Champs pour les notifications sociales
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: function () {
      return ['like_post', 'like_comment', 'dislike_comment', 'comment'].includes(this.type);
    },
  }, // Publication concernée (requis pour les notifications sociales)
  comment: {
    type: mongoose.Schema.Types.ObjectId,
  }, // ID du commentaire (optionnel, subdocument dans Post.comments)
  isAnonymous: {
    type: Boolean,
    default: false,
  }, // Si l'action est anonyme (pour les notifications sociales)
  anonymousPseudo: {
    type: String,
  }, // Pseudo anonyme (si isAnonymous est vrai)
  // Champs pour les notifications de rendez-vous
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: function () {
      return [
        'appointment_booked',
        'appointment_confirmed',
        'appointment_modified',
        'appointment_cancelled',
        'appointment_rejected',
      ].includes(this.type);
    },
  }, // Référence au rendez-vous (requis pour les notifications de rendez-vous)
  message: {
    type: String,
    required: function () {
      return [
        'appointment_booked',
        'appointment_confirmed',
        'appointment_modified',
        'appointment_cancelled',
        'appointment_rejected',
      ].includes(this.type);
    },
  }, // Message personnalisé (requis pour les notifications de rendez-vous)
  read: {
    type: Boolean,
    default: false,
  }, // Si la notification a été lue
  createdAt: {
    type: Date,
    default: Date.now,
  }, // Date de création
});

// Validation supplémentaire pour s'assurer de la cohérence des données
notificationSchema.pre('validate', function (next) {
  const socialTypes = ['like_post', 'like_comment', 'dislike_comment', 'comment'];
  const appointmentTypes = [
    'appointment_booked',
    'appointment_confirmed',
    'appointment_modified',
    'appointment_cancelled',
    'appointment_rejected',
  ];

  if (socialTypes.includes(this.type)) {
    if (!this.post) {
      return next(new Error('Le champ "post" est requis pour les notifications sociales'));
    }
    // Nettoyer les champs inutiles pour les notifications sociales
    this.appointment = undefined;
    this.message = undefined;
  } else if (appointmentTypes.includes(this.type)) {
    if (!this.appointment || !this.message) {
      return next(new Error('Les champs "appointment" et "message" sont requis pour les notifications de rendez-vous'));
    }
    // Nettoyer les champs inutiles pour les notifications de rendez-vous
    this.post = undefined;
    this.comment = undefined;
    this.isAnonymous = undefined;
    this.anonymousPseudo = undefined;
  }
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);