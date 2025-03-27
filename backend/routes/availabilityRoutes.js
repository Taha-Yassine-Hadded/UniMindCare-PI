const express = require('express');
const router = express.Router();
const Availability = require('../Models/Availability');
const mongoose = require('mongoose');

// Add or update a time slot
router.post('/', async (req, res) => {
    const { psychologistId, startTime, endTime, status, reason } = req.body;

    try {
        if (!mongoose.Types.ObjectId.isValid(psychologistId)) {
            return res.status(400).json({ message: 'Invalid psychologistId format' });
        }

        // Validate time range
        if (new Date(startTime) >= new Date(endTime)) {
            return res.status(400).json({ message: 'startTime must be before endTime' });
        }

        const availability = new Availability({
            psychologistId,
            startTime,
            endTime,
            status: status || 'available',
            reason: status === 'blocked' ? reason : null
        });

        await availability.save();
        res.status(201).json(availability);
    } catch (error) {
        console.error('Error adding availability:', error.stack);
        res.status(500).json({ message: 'Error adding availability', error: error.message });
    }
});

// Get availability for a psychologist
router.get('/', async (req, res) => {
    const { psychologistId, start, end } = req.query;

    try {
        if (!psychologistId || !mongoose.Types.ObjectId.isValid(psychologistId)) {
            return res.status(400).json({ message: 'Valid psychologistId is required' });
        }

        const query = { psychologistId };
        if (start && end) {
            query.startTime = { $gte: new Date(start) };
            query.endTime = { $lte: new Date(end) };
        }

        const availability = await Availability.find(query).sort({ startTime: 1 });
        res.json(availability);
    } catch (error) {
        console.error('Error fetching availability:', error.stack);
        res.status(500).json({ message: 'Error fetching availability', error: error.message });
    }
});

// Modify a time slot
router.put('/:id', async (req, res) => {
    const { startTime, endTime, status, reason } = req.body;

    try {
        if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
            return res.status(400).json({ message: 'startTime must be before endTime' });
        }

        const updateData = {};
        if (startTime) updateData.startTime = startTime;
        if (endTime) updateData.endTime = endTime;
        if (status) updateData.status = status;
        if (status === 'blocked') updateData.reason = reason || null;
        else updateData.reason = null;

        const availability = await Availability.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!availability) {
            return res.status(404).json({ message: 'Availability slot not found' });
        }

        res.json(availability);
    } catch (error) {
        console.error('Error modifying availability:', error.stack);
        res.status(500).json({ message: 'Error modifying availability', error: error.message });
    }
});

// Remove a time slot
router.delete('/:id', async (req, res) => {
    try {
        const availability = await Availability.findByIdAndDelete(req.params.id);
        if (!availability) {
            return res.status(404).json({ message: 'Availability slot not found' });
        }
        res.json({ message: 'Availability slot removed', availability });
    } catch (error) {
        console.error('Error removing availability:', error.stack);
        res.status(500).json({ message: 'Error removing availability', error: error.message });
    }
});
// Block a time slot (New Endpoint)
router.post('/block/:id', async (req, res) => {
    const { reason } = req.body;

    try {
        const availability = await Availability.findById(req.params.id);
        if (!availability) {
            return res.status(404).json({ message: 'Availability slot not found' });
        }

        if (availability.status === 'blocked') {
            return res.status(400).json({ message: 'Time slot is already blocked' });
        }

        availability.status = 'blocked';
        availability.reason = reason || 'Blocked by psychologist';
        await availability.save();

        res.json({ message: 'Time slot blocked', availability });
    } catch (error) {
        console.error('Error blocking availability:', error.stack);
        res.status(500).json({ message: 'Error blocking availability', error: error.message });
    }
});

module.exports = router;