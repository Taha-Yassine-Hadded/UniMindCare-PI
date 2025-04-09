const express = require('express');
const router = express.Router();
const Appointment = require('../Models/Appointment');
const Availability = require('../Models/Availability');
const Notification = require('../Models/Notification'); // Import Notification model
const mongoose = require('mongoose');
const User = require('../Models/Users'); // Corrected import (User, not Users)
const Case = require('../Models/Case');

// Helper function to create and emit a notification
const createAndEmitNotification = async (io, recipientId, senderId, type, appointmentId, message) => {
    try {
        if (!io) {
            console.error('Socket.IO instance is undefined');
            return;
        }
        const notification = new Notification({
            recipient: recipientId,
            sender: senderId,
            type,
            appointment: appointmentId,
            message,
        });
        await notification.save();
        console.log('Notification saved:', notification._id);

        const populatedNotification = await Notification.findById(notification._id)
            .populate('recipient', 'Name')
            .populate('sender', 'Name')
            .populate({
                path: 'appointment',
                populate: [
                    { path: 'studentId', select: 'Name' },
                    { path: 'psychologistId', select: 'Name' },
                ],
            });
        console.log('Populated notification:', JSON.stringify(populatedNotification, null, 2));

        io.to(recipientId.toString()).emit('new_notification', populatedNotification);
        console.log(`Emitted new_notification to ${recipientId.toString()}`);
    } catch (error) {
        console.error('Error in createAndEmitNotification:', error.stack);
    }
};
// Student/Psychologist: Get all appointments
router.get('/', async (req, res) => {
    const { studentId, psychologistId } = req.query;
    try {
        const query = {};
        if (studentId) {
            if (!mongoose.Types.ObjectId.isValid(studentId)) {
                return res.status(400).json({ message: 'Invalid studentId format' });
            }
            query.studentId = studentId;
        }
        if (psychologistId) {
            if (!mongoose.Types.ObjectId.isValid(psychologistId)) {
                return res.status(400).json({ message: 'Invalid psychologistId format' });
            }
            query.psychologistId = psychologistId;
        }

        const appointments = await Appointment.find(query)
            .populate('studentId', 'Name')
            .populate('psychologistId', 'Name');

        console.log('Fetched appointments:', JSON.stringify(appointments, null, 2));
        res.json(appointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ message: 'Error fetching appointments', error: error.message });
    }
});

// Student/Psychologist: Modify an appointment
router.put('/:id', async (req, res) => {
    const io = req.io;
    const { date, senderId } = req.body;
  
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid appointment ID format' });
      }
  
      const appointment = await Appointment.findById(req.params.id)
        .populate('studentId', 'Name')
        .populate('psychologistId', 'Name');
      if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  
      if (date) {
        const newStart = new Date(date);
        const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
        if (newStart < new Date()) {
          return res.status(400).json({ message: 'Cannot modify appointment to a past date' });
        }
  
        // Check availability if student is modifying - KEEP EXISTING LOGIC
        if (senderId.toString() === appointment.studentId._id.toString()) {
          const availableSlots = await Availability.find({
            psychologistId: appointment.psychologistId._id,
            status: 'available',
            startTime: { $lte: newStart },
            endTime: { $gte: newEnd },
          });
          const bookedSlots = await Appointment.find({
            psychologistId: appointment.psychologistId._id,
            status: { $ne: 'cancelled' },
            _id: { $ne: appointment._id }, // Exclude the current appointment
            date: { $gte: newStart, $lt: newEnd },
          });
  
          if (availableSlots.length === 0 || bookedSlots.length > 0) {
            return res.status(400).json({ message: "Selected time is not within the psychologist's available slots or is already booked" });
          }
        }
  
        appointment.date = date;
      }
      appointment.status = 'pending';
      await appointment.save();
  
      // FIXED: Correctly determine recipient based on who sent the modification
      const isStudentModifying = senderId.toString() === appointment.studentId._id.toString();
      const recipientId = isStudentModifying ? 
        appointment.psychologistId._id : 
        appointment.studentId._id;
      
      const senderName = isStudentModifying ? 
        appointment.studentId.Name : 
        appointment.psychologistId.Name;
      
      const message = `Appointment on ${new Date(appointment.date).toLocaleString()} has been modified by ${senderName}`;
      
      console.log(`Modification notification to: ${recipientId}`);
      await createAndEmitNotification(io, recipientId, senderId, 'appointment_modified', appointment._id, message);
  
      res.json(appointment);
    } catch (error) {
      console.error('Error modifying appointment:', error.stack);
      res.status(500).json({ message: 'Error modifying appointment', error: error.message });
    }
  });
  
  // Student/Psychologist: Cancel an appointment
  router.delete('/:id', async (req, res) => {
    const io = req.io;
    const { reasonForCancellation, senderId } = req.body;
  
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid appointment ID format' });
      }
  
      const appointment = await Appointment.findById(req.params.id)
        .populate('studentId', 'Name')
        .populate('psychologistId', 'Name');
      if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  
      appointment.status = 'cancelled';
      appointment.reasonForCancellation = reasonForCancellation;
      await appointment.save();
  
      // Update the linked case
      const linkedCase = await Case.findOne({
        studentId: appointment.studentId._id,
        psychologistId: appointment.psychologistId._id,
        archived: false
      }).populate('appointments');
  
      if (linkedCase) {
        // Rest of case update logic remains unchanged
        linkedCase.appointments = linkedCase.appointments.filter(app => app._id.toString() !== appointment._id.toString());
        const hasPendingAppointments = linkedCase.appointments.some(app => app.status === 'pending');
        const hasConfirmedAppointments = linkedCase.appointments.some(app => app.status === 'confirmed');
  
        if (hasPendingAppointments) {
          linkedCase.status = 'pending';
        } else if (hasConfirmedAppointments && linkedCase.status !== 'resolved') {
          linkedCase.status = 'in_progress';
        } else if (!hasPendingAppointments && !hasConfirmedAppointments && linkedCase.status !== 'resolved') {
          linkedCase.status = 'pending';
        }
        await linkedCase.save();
      }
  
      // FIXED: Correctly determine recipient based on who sent the cancellation
      const isStudentCancelling = senderId.toString() === appointment.studentId._id.toString();
      const recipientId = isStudentCancelling ? 
        appointment.psychologistId._id : 
        appointment.studentId._id;
      
      const senderName = isStudentCancelling ? 
        appointment.studentId.Name : 
        appointment.psychologistId.Name;
      
      const message = `Appointment on ${new Date(appointment.date).toLocaleString()} was cancelled by ${senderName}${reasonForCancellation ? ` (Reason: ${reasonForCancellation})` : ''}`;
      
      console.log(`Cancellation notification to: ${recipientId}`);
      await createAndEmitNotification(io, recipientId, senderId, 'appointment_cancelled', appointment._id, message);
  
      res.json({ message: 'Appointment cancelled', appointment, case: linkedCase });
    } catch (error) {
      console.error('Error cancelling appointment:', error.stack);
      res.status(500).json({ message: 'Error cancelling appointment', error: error.message });
    }
  });

// Psychologist: Confirm appointment
router.put('/confirm/:id', async (req, res) => {
    const io = req.io; // Access Socket.IO instance

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid appointment ID format' });
        }

        // Update the appointment’s status to "confirmed"
        const appointment = await Appointment.findById(req.params.id)
            .populate('studentId', 'Name')
            .populate('psychologistId', 'Name');
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        appointment.status = 'confirmed';
        await appointment.save();

        // Find or create the matching Case
        let foundCase = await Case.findOne({
            studentId: appointment.studentId,
            psychologistId: appointment.psychologistId,
            archived: false
        });

        if (!foundCase) {
            foundCase = new Case({
                studentId: appointment.studentId,
                psychologistId: appointment.psychologistId,
                status: 'pending',
                priority: appointment.priority
            });
        }

        // Update the case status if still "pending"
        if (foundCase.status === 'pending') {
            foundCase.status = 'in_progress';
        }

        // Ensure the appointment is linked in the Case
        if (!foundCase.appointments.includes(appointment._id)) {
            foundCase.appointments.push(appointment._id);
        }

        await foundCase.save();

        // Notify the student about the confirmation
        const message = `Your appointment on ${new Date(appointment.date).toLocaleString()} has been confirmed by ${appointment.psychologistId.Name}`;
        await createAndEmitNotification(
            io,
            appointment.studentId,
            appointment.psychologistId,
            'appointment_confirmed',
            appointment._id,
            message
        );

        return res.json({
            message: 'Appointment confirmed',
            appointment,
            case: foundCase
        });
    } catch (error) {
        res.status(500).json({ message: 'Error confirming appointment', error: error.message });
    }
});

// Get available time slots for a psychologist
router.get('/available', async (req, res) => {
    const { psychologistId, start, end } = req.query;

    try {
        if (!psychologistId || !mongoose.Types.ObjectId.isValid(psychologistId)) {
            return res.status(400).json({ message: 'Valid psychologistId is required' });
        }

        const query = {
            psychologistId,
            status: 'available' // Only show available slots
        };

        if (start && end) {
            query.startTime = { $gte: new Date(start) };
            query.endTime = { $lte: new Date(end) };
        }

        // Exclude slots that are already booked
        const bookedSlots = await Appointment.find({
            psychologistId,
            status: { $ne: 'cancelled' }
        }).select('date');

        const bookedTimes = bookedSlots.map(slot => slot.date);

        const availableSlots = await Availability.find(query)
            .sort({ startTime: 1 })
            .then(slots => slots.filter(slot => {
                const slotStart = new Date(slot.startTime);
                return !bookedTimes.some(booked => {
                    const bookedTime = new Date(booked);
                    return bookedTime >= slotStart && bookedTime < slot.endTime;
                });
            }));

        res.json(availableSlots);
    } catch (error) {
        console.error('Error fetching available slots:', error.stack);
        res.status(500).json({ message: 'Error fetching available slots', error: error.message });
    }
});

// Get all users with the "psychiatre" role
router.get('/psychiatres', async (req, res) => {
    try {
        const psychiatres = await User.find({ Role: 'psychiatre' }) // Adjusted 'Role' to 'role' to match User model
            .select('Name Email role Classe PhoneNumber imageUrl verified createdAt')
            .sort({ createdAt: -1 });

        if (psychiatres.length === 0) {
            return res.status(404).json({ message: 'No psychiatres found' });
        }

        res.json(psychiatres);
    } catch (error) {
        console.error('Error fetching psychiatres:', error.stack);
        res.status(500).json({ message: 'Error fetching psychiatres', error: error.message });
    }
});

module.exports = router;