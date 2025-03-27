const express = require('express');
const router = express.Router();
const Case = require('../Models/Case');
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
router.get('/', async (req, res) => {
    const { psychologistId } = req.query;
    console.log('Request query:', { psychologistId }); // Log incoming query

    try {
        const query = { archived: false };

        // Validate and cast psychologistId
        if (psychologistId) {
            console.log('Validating psychologistId:', psychologistId);
            if (!mongoose.Types.ObjectId.isValid(psychologistId)) {
                return res.status(400).json({ message: 'Invalid psychologistId format' });
            }
            query.psychologistId = psychologistId;
        }

        console.log('Query to MongoDB:', query); // Log the query

        // Fetch cases
        let cases = await Case.find(query);

        // Check if Student model exists before populating
        try {
            cases = await Case.find(query)
                .populate('studentId', 'name'); // Optional: populate student name
        } catch (populateError) {
            console.warn('Population failed, returning raw data:', populateError.message);
            cases = await Case.find(query); // Fallback to raw data
        }

        console.log('Cases found:', cases); // Log the result
        res.json(cases);
    } catch (error) {
        console.error('Error fetching cases:', error.stack); // Log full error stack
        res.status(500).json({ 
            message: 'Error fetching cases', 
            error: error.message || 'Unknown error', 
            stack: error.stack 
        });
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
router.put('/archive/:id', async (req, res) => {
    try {
        const updatedCase = await Case.findByIdAndUpdate(
            req.params.id,
            { archived: true },
            { new: true }
        );
        if (!updatedCase) return res.status(404).json({ message: 'Case not found' });
        res.json({ message: 'Case archived', case: updatedCase });
    } catch (error) {
        res.status(500).json({ message: 'Error archiving case', error });
    }
});

module.exports = router;