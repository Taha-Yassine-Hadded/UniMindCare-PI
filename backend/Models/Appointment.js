const mongoose = require('mongoose');
const { Schema } = mongoose;

const appointmentSchema = new Schema({
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
    date: { 
        type: Date, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'confirmed', 'cancelled'], 
        default: 'pending' 
    },
    reasonForCancellation: { 
        type: String, 
        default: null 
    },
    priority: { 
        type: String, 
        enum: ['emergency', 'regular'], 
        default: 'regular' // Default to regular if not specified
    }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);