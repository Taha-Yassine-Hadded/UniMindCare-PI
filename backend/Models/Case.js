const mongoose = require('mongoose');
const { Schema } = mongoose;

const caseSchema = new Schema({
    studentId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Student', 
        required: true 
    },
    psychologistId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Psychologist', 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'in_progress', 'resolved'], 
        default: 'pending' 
    },
    priority: { 
        type: String, 
        enum: ['emergency', 'regular'], 
        default: 'regular' 
    },
    notes: { type: String },
    archived: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Case', caseSchema);