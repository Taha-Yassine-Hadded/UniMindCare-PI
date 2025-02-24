const express = require("express");
const router = express.Router();

const { enable2FA, verify2FA } = require("../controllers/twoFactorController");

// Définition des routes d'authentification à deux facteurs
router.post("/enable-2fa", enable2FA);
router.post("/verify-2fa", verify2FA);

// Route supplémentaire si nécessaire
router.post('/two-factor', (req, res) => {
    res.send('Two-factor authentication');
});

module.exports = router;
