const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment'
    },
    psychologistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Assurez-vous que cette référence est correcte
      required: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Assurez-vous que cette référence est correcte
      required: true
    },
    templateType: {
      type: String,
      enum: ['standard', 'initial_assessment', 'progress_update', 'crisis_intervention', 'follow_up'],
      default: 'standard'
    },
    title: {
      type: String,
      required: true
    },
    objectives: {
      type: String,
      required: true
    },
    observations: {
      type: String,
      required: true
    },
    assessments: {
      type: String
    },
    treatment: {
      type: String
    },
    actions: {
      type: String
    },
    followUpPlan: {
      type: String
    },
    privateNotes: {
      type: String
    },
    status: {
      type: String,
      enum: ['draft', 'completed'],
      default: 'draft'
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SessionNote', noteSchema);