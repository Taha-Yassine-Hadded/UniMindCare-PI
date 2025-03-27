const mongoose = require('mongoose');
const { Schema } = mongoose;

const availabilitySchema = new Schema({
    psychologistId: {
        type: Schema.Types.ObjectId,
        ref: 'Psychologist',
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['available', 'blocked'],
        default: 'available'
    },
    reason: {
        type: String,
        default: null // Optional reason for blocking
    }
}, { timestamps: true });

// Ensure no overlapping time slots for the same psychologist (optional validation)
availabilitySchema.index({ psychologistId: 1, startTime: 1, endTime: 1 }, { unique: true });

module.exports = mongoose.model('Availability', availabilitySchema);