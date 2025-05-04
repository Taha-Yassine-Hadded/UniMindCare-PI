require('dotenv').config();
const express = require('express');
const router = express.Router();
const User = require('../Models/Users');
const jwt = require('jsonwebtoken'); // Ajoutez ceci si vous utilisez JWT
const speakeasy = require('speakeasy'); // Pour générer le secret 2FA
const qrcode = require('qrcode');     // Pour générer le QR code
const authMiddleware = require('../middleware/auth'); // Importer authMiddleware

router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ Identifiant: decoded.identifiant });

       

        if (!user) return res.status(404).json({ message: 'User not found' });
        console.log('Données renvoyées par /me:', {
            _id: user._id,
            Name: user.Name,
            Identifiant: user.Identifiant,
            Email: user.Email,
            Classe: user.Classe,
            Role: user.Role,
            PhoneNumber: user.PhoneNumber,
            imageUrl: user.imageUrl,
            twoFactorEnabled: user.twoFactorEnabled || false,
          });
        res.json({
            _id: user._id, // Add the _id field (zedha baha bech supprimer al comment walet temchi kenn star hetha zedt)
            Name: user.Name,
            Identifiant: user.Identifiant,
            Email: user.Email,
            Classe: user.Classe,
            Role: user.Role,
            PhoneNumber: user.PhoneNumber,
            imageUrl: user.imageUrl,
            userId: user._id,
            twoFactorEnabled: user.twoFactorEnabled || false // Ajout du statut 2FA
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.get('/generate-2fa', async (req, res) => {
    try {
        console.log('Requête reçue pour /generate-2fa');
        const token = req.headers.authorization?.split(' ')[1];
        console.log('Token reçu :', token);
        if (!token) {
            console.log('Aucun token fourni');
            return res.status(401).json({ message: 'No token provided' });
        }

        console.log('Vérification du token...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token décodé :', decoded);

        console.log('Recherche utilisateur avec Identifiant :', decoded.identifiant);
        const user = await User.findOne({ Identifiant: decoded.identifiant });
        if (!user) {
            console.log('Utilisateur non trouvé');
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('Génération du secret 2FA...');
        const secret = speakeasy.generateSecret({
            name: `UniMindCare:${user.Email}`,
            issuer: 'UniMindCare'
        });

        console.log('Mise à jour du secret temporaire...');
        user.twoFactorSecretTemp = secret.base32;
        await user.save();

        console.log('Génération du QR code...');
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
        console.log('QR code généré avec succès');
        res.json({ qrCodeUrl, secret: secret.base32 });
    } catch (error) {
        console.error('Erreur dans /generate-2fa :', error.stack);
        res.status(500).json({ message: error.message });
    }
});


// Nouvelle route pour activer le 2FA après validation
router.post('/enable-2fa', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ Identifiant: decoded.identifiant });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { code } = req.body; // Code saisi par l'utilisateur après scan
        const isValid = speakeasy.totp.verify({
            secret: user.twoFactorSecretTemp,
            encoding: 'base32',
            token: code
        });

        if (!isValid) return res.status(400).json({ message: 'Code 2FA invalide' });

        // Activer 2FA
        user.twoFactorSecret = user.twoFactorSecretTemp;
        user.twoFactorEnabled = true;
        user.twoFactorSecretTemp = null; // Effacer le secret temporaire
        await user.save();

        res.json({ message: '2FA activé avec succès' });
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
        if (Password) user.Password = Password; // Devrait être hashé en production !

        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Route pour récupérer les badges d'un utilisateur
router.get('/:id/badges', async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('badges');
      if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
      res.status(200).json(user.badges || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des badges:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });


  router.get("/all", authMiddleware, async (req, res) => {
    try {
      const { role } = req.query;
      const users = await User.find(role ? { Role: role } : {}, "Name Email Identifiant");
      res.json(users);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs :", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });


module.exports = router;