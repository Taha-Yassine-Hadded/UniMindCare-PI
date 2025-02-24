const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const User = require("../models/user");

exports.enable2FA = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).send("Utilisateur introuvable");

    const secret = speakeasy.generateSecret({ name: `MyApp (${user.email})` });
    user.twoFactorSecret = secret.base32;
    user.is2FAEnabled = true;
    await user.save();

    const otpauthUrl = encodeURIComponent(secret.otpauth_url);
    QRCode.toDataURL(otpauthUrl, (err, dataUrl) => {
      if (err) return res.status(500).send("Erreur QR Code");
      res.json({ message: "2FA activé", qrCode: dataUrl });
    });
  } catch (error) {
    res.status(500).send("Erreur serveur : " + error.message);
  }
};

exports.verify2FA = async (req, res) => {
  const { userId, token } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user || !user.twoFactorSecret) return res.status(404).send("Utilisateur ou secret introuvable");

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
    });

    if (verified) {
      user.verified2FA = true;
      await user.save();
      res.send("2FA vérifié !");
    } else {
      res.status(400).send("Code OTP invalide");
    }
  } catch (error) {
    res.status(500).send("Erreur serveur : " + error.message);
  }
};