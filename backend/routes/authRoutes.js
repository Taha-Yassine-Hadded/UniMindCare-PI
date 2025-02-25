const express = require("express");
const router = express.Router();
const { login, enable2FA, verify2FA } = require("../controllers/authController");

router.post("/login", login);
router.post("/enable-2fa", enable2FA);
router.post("/verify-2fa", verify2FA);

module.exports = router;