const mongoose = require('mongoose');
const { Schema } = mongoose;

const caseSchema = new Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    psychologistId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'in_progress', 'resolved'], default: 'pending' },
    priority: { type: String, enum: ['emergency', 'regular'], default: 'regular' },
    notes: { type: String },
    archived: { type: Boolean, default: false },
    sessionNotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SessionNote'
    }],
    // Link to appointments
    appointments: [{ type: Schema.Types.ObjectId, ref: 'Appointment' }],
  }, { timestamps: true });

 
module.exports = mongoose.model('Case', caseSchema);