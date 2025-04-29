const express = require('express');
const router = express.Router();
const Case = require('../Models/Case');
const Appointment = require('../Models/Appointment');
const Availability = require('../Models/Availability');
const Notification = require('../Models/Notification'); // Import Notification model
const mongoose = require('mongoose');

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
// Psychologist: Create a new case
router.post('/', async (req, res) => {
    const { studentId, psychologistId, priority, notes } = req.body;
    try {
        if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(psychologistId)) {
            return res.status(400).json({ message: 'Invalid studentId or psychologistId format' });
        }

        const newCase = new Case({ studentId, psychologistId, priority, notes });
        await newCase.save();
        res.status(201).json(newCase);
    } catch (error) {
        res.status(500).json({ message: 'Error creating case', error: error.message });
    }
});

// Psychologist: Get all cases
router.get('/', async (req, res) => {
    const { psychologistId } = req.query;
    try {
        let cases;
        
        if (psychologistId) {
            if (!mongoose.Types.ObjectId.isValid(psychologistId)) {
                return res.status(400).json({ message: 'Invalid psychologistId format' });
            }
            
            // Find cases where:
            // 1. Either the case's psychologistId matches OR
            // 2. Any appointment within the case has this psychologistId
            cases = await Case.find({
                $or: [
                    { psychologistId }, 
                    { 'appointments.psychologistId': psychologistId }
                ],
                archived: false
            })
            .populate('studentId', 'Name')
            .populate({
                path: 'appointments',
                populate: {
                    path: 'studentId',
                    select: 'Name'
                }
            })
            .populate({
                path: 'appointments',
                populate: {
                    path: 'psychologistId',
                    select: 'Name'
                }
            });
        } else {
            cases = await Case.find({ archived: false })
                .populate('studentId', 'Name')
                .populate({
                    path: 'appointments',
                    populate: {
                        path: 'studentId',
                        select: 'Name'
                    }
                })
                .populate({
                    path: 'appointments',
                    populate: {
                        path: 'psychologistId',
                        select: 'Name'
                    }
                });
        }
        
        res.json(cases);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cases', error: error.message });
    }
});

// Psychologist: Update case (status, priority, notes)
router.put('/:id', async (req, res) => {
    const { status, priority, notes } = req.body;
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid case ID format' });
        }

        const updatedCase = await Case.findByIdAndUpdate(
            req.params.id,
            { status, priority, notes },
            { new: true }
        );
        if (!updatedCase) return res.status(404).json({ message: 'Case not found' });
        res.json(updatedCase);
    } catch (error) {
        res.status(500).json({ message: 'Error updating case', error: error.message });
    }
});

// Psychologist: Archive a case
router.get('/archived', async (req, res) => {
    const { psychologistId } = req.query;
    const query = { archived: true };

    if (psychologistId) {
        if (!mongoose.Types.ObjectId.isValid(psychologistId)) {
            return res.status(400).json({ message: 'Invalid psychologistId format' });
        }
        query.psychologistId = psychologistId;
    }

    try {
        const cases = await Case.find(query)
            .populate('studentId', 'Name')
            .populate({
                path: 'appointments',
                populate: {
                    path: 'studentId',
                    select: 'Name'
                }
            });
        res.json(cases);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching archived cases', error: error.message });
    }
});

// Attach an appointment to a case
router.post('/:id/add-appointment', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid case ID format' });
        }

        const { appointmentId } = req.body;
        if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
            return res.status(400).json({ message: 'Invalid appointmentId format' });
        }

        const updatedCase = await Case.findByIdAndUpdate(
            req.params.id,
            { $push: { appointments: appointmentId } },
            { new: true }
        ).populate('appointments');
        if (!updatedCase) return res.status(404).json({ message: 'Case not found' });
        res.json(updatedCase);
    } catch (error) {
        res.status(500).json({ message: 'Error linking appointment', error: error.message });
    }
});

// Fetch case details (with appointments)
router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid case ID format' });
        }

        const foundCase = await Case.findById(req.params.id)
            .populate('studentId', 'Name')
            .populate('psychologistId', 'Name')
            .populate('appointments');
        if (!foundCase) return res.status(404).json({ message: 'Case not found' });
        res.json(foundCase);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching case', error: error.message });
    }
});

// Create or fetch a case when booking an appointment
router.post('/book-appointment', async (req, res) => {
    const io = req.io; // Access Socket.IO instance
    try {
        const { studentId, psychologistId, date, priority } = req.body;

        // Validate IDs
        if (
            !mongoose.Types.ObjectId.isValid(studentId) ||
            !mongoose.Types.ObjectId.isValid(psychologistId)
        ) {
            return res.status(400).json({ message: 'Invalid studentId or psychologistId format' });
        }

        const appointmentDate = new Date(date);

        // Validate priority if provided
        const validPriorities = ['emergency', 'regular'];
        if (priority && !validPriorities.includes(priority)) {
            return res.status(400).json({ message: 'Invalid priority value. Must be "emergency" or "regular"' });
        }

        // Check for an availability slot for this psychologist
        const slot = await Availability.findOne({
            psychologistId,
            startTime: { $lte: appointmentDate },
            endTime: { $gt: appointmentDate }
        });

        // If slot exists and is blocked, reject booking
        if (slot && slot.status === 'blocked') {
            return res.status(400).json({ message: 'Time slot is blocked' });
        }

        // Define a time window for the appointment (e.g., 30 minutes duration)
        const appointmentDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
        const startWindow = appointmentDate;
        const endWindow = new Date(appointmentDate.getTime() + appointmentDuration);

        // Check if an appointment already exists in the time window (excluding cancelled ones)
        const existingAppointment = await Appointment.findOne({
            psychologistId,
            date: { $gte: startWindow, $lt: endWindow },
            status: { $ne: 'cancelled' }
        });

        if (existingAppointment) {
            return res.status(400).json({ message: 'Time slot is already booked' });
        }

        // Create new appointment with 'pending' status
        const appointment = await Appointment.create({
            studentId,
            psychologistId,
            date: appointmentDate,
            priority: priority || 'regular',
            status: 'pending'
        });

        // Check if a case already exists for this student with this psychologist
        let existingCase = await Case.findOne({ studentId, psychologistId });

        if (existingCase) {
            // If the case was resolved or archived, "re-open" it.
            if (existingCase.archived === true || existingCase.status === 'resolved') {
                existingCase.archived = false;
                existingCase.status = 'pending';
            }
            // Add the new appointment if not already linked.
            if (!existingCase.appointments.includes(appointment._id)) {
                existingCase.appointments.push(appointment._id);
            }
            await existingCase.save();
        } else {
            // Otherwise, create a new case.
            existingCase = await Case.create({
                studentId,
                psychologistId,
                status: 'pending',
                priority: priority || 'regular',
                appointments: [appointment._id],
                archived: false
            });
        }

        // Notify the psychologist about the new appointment request
        const message = `New appointment request from student on ${new Date(appointment.date).toLocaleString()}`;
        await createAndEmitNotification(
            io,
            psychologistId,
            studentId,
            'appointment_booked',
            appointment._id,
            message
        );

        res.status(201).json({
            message: 'Appointment booked and case updated',
            appointment,
            case: existingCase
        });
    } catch (error) {
        res.status(500).json({ message: 'Error booking appointment', error: error.message });
    }
});

// Update case status automatically when an appointment is confirmed
router.put('/confirm-appointment/:appointmentId', async (req, res) => {
    const io = req.io; // Access Socket.IO instance
    try {
        const { appointmentId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
            return res.status(400).json({ message: 'Invalid appointmentId format' });
        }

        const appointment = await Appointment.findById(appointmentId)
            .populate('studentId', 'Name')
            .populate('psychologistId', 'Name');
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Mark the appointment as confirmed
        appointment.status = 'confirmed';
        await appointment.save();

        // Now update the case’s status to in_progress if it isn’t already resolved or archived
        const linkedCase = await Case.findOne({
            studentId: appointment.studentId,
            psychologistId: appointment.psychologistId,
            archived: false
        });
        if (linkedCase && linkedCase.status !== 'resolved') {
            linkedCase.status = 'in_progress';
            await linkedCase.save();
        }

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

        res.json({ message: 'Appointment confirmed', appointment, case: linkedCase });
    } catch (error) {
        res.status(500).json({ message: 'Error confirming appointment', error: error.message });
    }
});

// Psychologist resolves and archives a case
router.put('/:caseId/resolve', async (req, res) => {
    try {
        const { caseId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(caseId)) {
            return res.status(400).json({ message: 'Invalid caseId format' });
        }

        let foundCase = await Case.findById(caseId);
        if (!foundCase) {
            return res.status(404).json({ message: 'Case not found' });
        }

        // Mark the case as resolved and archived
        foundCase.status = 'resolved';
        foundCase.archived = true;
        await foundCase.save();

        res.json({ message: 'Case resolved and archived', case: foundCase });
    } catch (error) {
        res.status(500).json({ message: 'Error resolving case', error: error.message });
    }
});

module.exports = router;