const mongoose = require('mongoose');

const noteTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    type: {
      type: String,
      enum: ['standard', 'initial_assessment', 'progress_update', 'crisis_intervention', 'follow_up'],
      default: 'standard'
    },
    structure: {
      objectives: {
        label: String,
        placeholder: String,
        required: Boolean,
        defaultValue: String
      },
      observations: {
        label: String,
        placeholder: String,
        required: Boolean,
        defaultValue: String
      },
      assessments: {
        label: String,
        placeholder: String,
        required: Boolean,
        defaultValue: String
      },
      treatment: {
        label: String,
        placeholder: String,
        required: Boolean,
        defaultValue: String
      },
      actions: {
        label: String,
        placeholder: String,
        required: Boolean,
        defaultValue: String
      },
      followUpPlan: {
        label: String,
        placeholder: String,
        required: Boolean,
        defaultValue: String
      }
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users'
    },
    isGlobal: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('NoteTemplate', noteTemplateSchema);