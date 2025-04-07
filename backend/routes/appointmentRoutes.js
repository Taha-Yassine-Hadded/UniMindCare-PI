const express = require('express');
const router = express.Router();
const Appointment = require('../Models/Appointment');
const Availability = require('../Models/Availability');
const mongoose = require('mongoose'); // Add this line
const User = require('../Models/Users');
const Case = require('../Models/Case'); // Import the Case model
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
            .populate('studentId', 'Name') // Use 'User' model and 'Name' field
            .populate('psychologistId', 'Name');

        console.log('Fetched appointments:', JSON.stringify(appointments, null, 2)); // Debug log
        res.json(appointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ message: 'Error fetching appointments', error: error.message });
    }
});

// Student: Modify an appointment
router.put('/:id', async (req, res) => {
    const { date } = req.body;
    try {
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { date, status: 'pending' },
            { new: true }
        );
        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
        res.json(appointment);
    } catch (error) {
        res.status(500).json({ message: 'Error modifying appointment', error });
    }
});

// Student/Psychologist: Cancel an appointment
router.delete('/:id', async (req, res) => {
    const { reasonForCancellation } = req.body;
    try {
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status: 'cancelled', reasonForCancellation },
            { new: true }
        );
        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
        res.json({ message: 'Appointment cancelled', appointment });
    } catch (error) {
        res.status(500).json({ message: 'Error cancelling appointment', error });
    }
});

// Psychologist: Confirm appointment
router.put('/confirm/:id', async (req, res) => {
    try {
      // 1) Update the appointment’s status to "confirmed"
      const appointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        { status: 'confirmed' },
        { new: true }
      );
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
  
      // 2) Find or create the matching Case
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
  
      // 3) Update the case status if still "pending"
      if (foundCase.status === 'pending') {
        foundCase.status = 'in_progress';
      }
  
      // 4) Ensure the appointment is linked in the Case
      if (!foundCase.appointments.includes(appointment._id)) {
        foundCase.appointments.push(appointment._id);
      }
  
      await foundCase.save();
  
      return res.json({
        message: 'Appointment confirmed',
        appointment,
        case: foundCase
      });
    } catch (error) {
      res.status(500).json({ message: 'Error confirming appointment', error });
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
            status: { $ne: 'cancelled' } // Exclude cancelled appointments
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

// Book an appointment
router.post('/book', async (req, res) => {
    const { studentId, psychologistId, date, priority } = req.body;

    try {
        if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(psychologistId)) {
            return res.status(400).json({ message: 'Invalid studentId or psychologistId format' });
        }

        const appointmentDate = new Date(date);
        console.log('Booking date:', appointmentDate);

        // Validate priority if provided
        const validPriorities = ['emergency', 'regular'];
        if (priority && !validPriorities.includes(priority)) {
            return res.status(400).json({ message: 'Invalid priority value. Must be "emergency" or "regular"' });
        }

        // Check for any availability slot (available or blocked)
        const slot = await Availability.findOne({
            psychologistId,
            startTime: { $lte: appointmentDate },
            endTime: { $gt: appointmentDate }
        });
        console.log('Found slot:', slot);

        // Only reject if slot exists and is blocked
        if (slot && slot.status === 'blocked') {
            console.log('Slot is blocked, rejecting booking');
            return res.status(400).json({ message: 'Time slot is blocked' });
        }

        // Check if the slot is already booked
        const existingAppointment = await Appointment.findOne({
            psychologistId,
            date: appointmentDate,
            status: { $ne: 'cancelled' }
        });
        console.log('Existing appointment:', existingAppointment);

        if (existingAppointment) {
            return res.status(400).json({ message: 'Time slot is already booked' });
        }

        const appointment = new Appointment({
            studentId,
            psychologistId,
            date: appointmentDate,
            status: 'pending',
            priority: priority || 'regular' // Use provided priority or default to 'regular'
        });

        await appointment.save();
        console.log('Appointment booked:', appointment);
        res.status(201).json(appointment);
    } catch (error) {
        console.error('Error booking appointment:', error.stack);
        res.status(500).json({ message: 'Error booking appointment', error: error.message });
    }
});
// Get all users with the "psychiatre" role
router.get('/psychiatres', async (req, res) => {
    try {
        const psychiatres = await User.find({ Role: 'psychiatre' })
            .select('Name Email Role Classe PhoneNumber imageUrl verified createdAt') // Select relevant fields
            .sort({ createdAt: -1 }); // Sort by creation date, newest first

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