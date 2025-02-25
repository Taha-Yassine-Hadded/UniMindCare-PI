const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const User = require("../models/user");

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    
    // Si l'utilisateur n'existe pas, on le crée et on lance la procédure 2FA
    if (!user) {
      console.log("Utilisateur introuvable. Création automatique de l'utilisateur et activation 2FA");
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({
        email,
        password: hashedPassword,
        is2FAEnabled: false,
      });
      await user.save();
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).send("Mot de passe invalide");

    // Si le 2FA n'est pas activé, on l'active automatiquement
    if (!user.is2FAEnabled) {
      console.log("Activation automatique du 2FA pour l'utilisateur:", email);
      const secret = speakeasy.generateSecret({ name: `MyApp (${user.email})` });
      user.twoFactorSecret = secret.base32;
      user.is2FAEnabled = true;
      await user.save();

      // Génération du QR Code
      const otpauthUrl = secret.otpauth_url;
      return QRCode.toDataURL(otpauthUrl, (err, dataUrl) => {
        if (err) return res.status(500).send("Erreur lors de la génération du QR Code");
        return res.json({ message: "2FA activé", qrCode: dataUrl, userId: user._id });
      });
    }

    // Si le 2FA est activé mais pas encore vérifié, on demande la vérification
    if (!user.verified2FA) {
      return res.json({ message: "2FA requis", userId: user._id });
    }

    // Si l'utilisateur est vérifié, générer un token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  } catch (error) {
    res.status(500).send("Erreur serveur : " + error.message);
  }
};
exports.enable2FA = async (req, res) => {
  // Exemple de mise en œuvre pour activer le 2FA
  try {
    const { email } = req.body;
    let user = await User.findOne({ email });
    if (!user) return res.status(404).send("Utilisateur non trouvé");

    const secret = speakeasy.generateSecret({ name: `MyApp (${user.email})` });
    user.twoFactorSecret = secret.base32;
    user.is2FAEnabled = true;
    await user.save();

    const otpauthUrl = secret.otpauth_url;
    QRCode.toDataURL(otpauthUrl, (err, dataUrl) => {
      if (err) return res.status(500).send("Erreur lors de la génération du QR Code");
      res.json({ message: "2FA activé", qrCode: dataUrl, userId: user._id });
    });
  } catch (error) {
    res.status(500).send("Erreur serveur : " + error.message);
  }
};
exports.verify2FA = async (req, res) => {
  // Exemple de mise en œuvre pour vérifier le 2FA
  try {
    const { email, token } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send("Utilisateur non trouvé");

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
    });

    if (verified) {
      user.verified2FA = true;
      await user.save();
      // Générer un token JWT après vérification réussie
      const jwtToken = jwt.sign({ userId: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
      res.json({ message: "2FA vérifié", token: jwtToken });
    } else {
      res.status(401).send("Code 2FA invalide");
    }
  } catch (error) {
    res.status(500).send("Erreur serveur : " + error.message);
  }
};