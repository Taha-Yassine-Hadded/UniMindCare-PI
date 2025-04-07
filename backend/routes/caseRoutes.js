const express = require('express');
const router = express.Router();
const Case = require('../Models/Case');
const Appointment = require('../Models/Appointment');
const Availability = require('../Models/Availability');
const mongoose = require('mongoose'); // Add this line
// Psychologist: Create a new case
router.post('/', async (req, res) => {
    const { studentId, psychologistId, priority, notes } = req.body;
    try {
        const newCase = new Case({ studentId, psychologistId, priority, notes });
        await newCase.save();
        res.status(201).json(newCase);
    } catch (error) {
        res.status(500).json({ message: 'Error creating case', error });
    }
});

// Psychologist: Get all cases
// caseRoutes.js
router.get('/', async (req, res) => {
    const { psychologistId } = req.query;
    const query = { archived: false };
    if (psychologistId) query.psychologistId = psychologistId;
  
    try {
      const cases = await Case.find(query)
        .populate('studentId', 'Name')     // matches studentId: { ref: 'User' } 
        .populate({
          path: 'appointments',            // matches appointments: [{ ref: 'Appointment' }]
          populate: {
            path: 'studentId',            // again matches appointmentSchema: { ref: 'User' }
            select: 'Name'                // or select: 'Name' if the field is uppercase
          }
        });
      res.json(cases);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching cases', error });
    }
  });

// Psychologist: Update case (status, priority, notes)
router.put('/:id', async (req, res) => {
    const { status, priority, notes } = req.body;
    try {
        const updatedCase = await Case.findByIdAndUpdate(
            req.params.id,
            { status, priority, notes },
            { new: true }
        );
        if (!updatedCase) return res.status(404).json({ message: 'Case not found' });
        res.json(updatedCase);
    } catch (error) {
        res.status(500).json({ message: 'Error updating case', error });
    }
});

// Psychologist: Archive a case
router.get('/archived', async (req, res) => {
    const { psychologistId } = req.query;
    const query = { archived: true };
  
    if (psychologistId) {
      // ...
      query.psychologistId = psychologistId;
    }
  
    try {
      // Populate studentId and appointments
      const cases = await Case.find(query)
        .populate('studentId', 'Name')  // capital "N" if that's how it's stored 
        .populate({
          path: 'appointments',
          populate: {
            path: 'studentId',
            select: 'Name'
          }
        });
  
      res.json(cases);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching archived cases', error });
    }
  });
// Attach an appointment to a case
router.post('/:id/add-appointment', async (req, res) => {
    try {
      const { appointmentId } = req.body;
      const updatedCase = await Case.findByIdAndUpdate(
        req.params.id,
        { $push: { appointments: appointmentId } },
        { new: true }
      ).populate('appointments');
      res.json(updatedCase);
    } catch (error) {
      res.status(500).json({ message: 'Error linking appointment', error });
    }
  });
  
  // Fetch case details (with appointments)
  router.get('/:id', async (req, res) => {
    try {
      const foundCase = await Case.findById(req.params.id)
        .populate('studentId', 'name')
        .populate('psychologistId', 'name')
        .populate('appointments'); // Includes full appointment objects
      res.json(foundCase);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching case', error });
    }
  });
  // 1) Create or fetch a case when booking an appointment
  router.post('/book-appointment', async (req, res) => {
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
      // (Assuming Availability is imported elsewhere)
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
      
      res.status(201).json({
        message: 'Appointment booked and case updated',
        appointment,
        case: existingCase
      });
    } catch (error) {
      res.status(500).json({ message: 'Time slot is already booked', error });
    }
  });
  // 2) Update case status automatically when an appointment is confirmed
  router.put('/confirm-appointment/:appointmentId', async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const appointment = await Appointment.findById(appointmentId);
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
  
      res.json({ message: 'Appointment confirmed', appointment, case: linkedCase });
    } catch (error) {
      res.status(500).json({ message: 'Error confirming appointment', error });
    }
  });
  
  // 3) Psychologist resolves and archives a case
  router.put('/:caseId/resolve', async (req, res) => {
    try {
      const { caseId } = req.params;
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
      res.status(500).json({ message: 'Error resolving case', error });
    }
  });
  
module.exports = router;