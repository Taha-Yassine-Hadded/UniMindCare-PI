// routes/notifications.js
const express = require('express');
const router = express.Router();
const Notification = require('../Models/Notification');
const passport = require('passport'); // Assuming you have passportConfig.js

// Get notifications for the logged-in user
router.get('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .populate('sender', 'Name')
            .populate('recipient', 'Name')
            .populate('appointment')
            .sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Mark a notification as read
router.put('/:id/read', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (notification.recipient.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to modify this notification' });
        }

        notification.read = true;
        await notification.save();
        res.status(200).json(notification);
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;