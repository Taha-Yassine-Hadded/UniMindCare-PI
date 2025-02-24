const express = require('express');
const router = express.Router();
const User = require('../models/Users');

// Route GET pour récupérer un utilisateur
router.get('/:identifiant', async (req, res) => {
    try {
        const user = await User.findOne({ Identifiant: req.params.identifiant });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Retourner les données dans le bon format
        res.json({
            Name: user.Name,
            Identifiant: user.Identifiant,
            Email: user.Email,
            Classe: user.Classe,
            Role: user.Role,
            PhoneNumber: user.PhoneNumber,
            imageUrl: user.imageUrl,
            Password: user.Password  // Attention : ne jamais envoyer un mot de passe en clair dans une API !
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Route PUT pour mettre à jour un utilisateur
router.put('/:identifiant', async (req, res) => {
    try {
        const { Name, Email, Classe, Role, PhoneNumber, Password, imageUrl } = req.body;

        const user = await User.findOne({ Identifiant: req.params.identifiant });
        if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

        // Mise à jour des champs
        user.Name = Name || user.Name;
        user.Email = Email || user.Email;
        user.Classe = Classe || user.Classe;
        user.Role = Role || user.Role;
        user.PhoneNumber = PhoneNumber || user.PhoneNumber;
        user.imageUrl = imageUrl || user.imageUrl;

        if (Password) {
            user.Password = Password;  // Stocke le mot de passe en clair
        }

        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
