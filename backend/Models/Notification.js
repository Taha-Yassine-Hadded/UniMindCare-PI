// Models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }, // User who receives the notification (student or psychologist)
    sender: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }, // User who triggered the notification (student or psychologist)
    type: { 
        type: String, 
        enum: [
            'appointment_booked', // Student booked an appointment
            'appointment_confirmed', // Psychologist confirmed an appointment
            'appointment_modified', // Appointment was modified
            'appointment_cancelled', // Appointment was cancelled
            'appointment_rejected' // Psychologist rejected an appointment
        ], 
        required: true 
    },
    appointment: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Appointment', 
        required: true 
    }, // Reference to the appointment
    message: { 
        type: String, 
        required: true 
    }, // Custom message for the notification
    read: { 
        type: Boolean, 
        default: false 
    }, // Whether the notification has been read
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
});

module.exports = mongoose.model('Notification', notificationSchema);