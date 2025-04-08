const express = require('express');
const router = express.Router();
const User = require('../Models/Users');
const jwt = require('jsonwebtoken'); // Ajoutez ceci si vous utilisez JWT

router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ Identifiant: decoded.identifiant });

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({
            Name: user.Name,
            Identifiant: user.Identifiant,
            Email: user.Email,
            Classe: user.Classe,
            Role: user.Role,
            PhoneNumber: user.PhoneNumber,
            imageUrl: user.imageUrl,
            userId: user._id,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/:identifiant', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.identifiant !== req.params.identifiant) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const { Name, Email, Classe, Role, PhoneNumber, Password, imageUrl } = req.body;
        const user = await User.findOne({ Identifiant: req.params.identifiant });
        if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

        user.Name = Name || user.Name;
        user.Email = Email || user.Email;
        user.Classe = Classe || user.Classe;
        user.Role = Role || user.Role;
        user.PhoneNumber = PhoneNumber || user.PhoneNumber;
        user.imageUrl = imageUrl || user.imageUrl;
        if (Password) user.Password = Password; // Devrait être hashé en production !

        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;