const express = require("express");
const router = express.Router();

const { enable2FA, verify2FA } = require("../controllers/twoFactorController");


router.post("/enable-2fa", enable2FA);
router.post("/verify-2fa", verify2FA);


module.exports = router;
