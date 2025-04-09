var express = require("express");
var router = express.Router();
const User = require("../Models/Users"); // Import the User model
const { transporter } = require("../config/emailConfig");
const loginLink = "http://localhost:3000/tivo/authentication/login-simple";
const bcrypt = require("bcryptjs");
const { validateToken } = require('../middleware/authentication');
const multer = require('multer'); // For handling file uploads
const {bucket} = require('../firebase'); // Firebase Storage bucket

// Configure Multer for file uploads
const storage = multer.memoryStorage(); // Store file in memory before uploading to Firebase
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype) {
      return cb(null, true);
    }
    cb(new Error('Seules les images JPEG et PNG sont autorisées'));
  },
});

router.get('/auth/me', validateToken, async (req, res) => {
  try {
    res.json({ userId: req.user.userId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


/* POST to add a new user */
router.post("/add", async function (req, res, next) {
  try {
    const {
      Name,
      Identifiant,
      Email,
      Password,
      Classe,
      Role,
      PhoneNumber,
      Enabled = true, // Default to true if not provided
    } = req.body;

    // Validate required fields
    if (!Name || !Identifiant || !Email || !Password || !Role || !PhoneNumber) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Validate email domain
    if (!Email.endsWith("@esprit.tn")) {
      return res.status(400).json({ message: "Email must end with @esprit.tn" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ Email }, { Identifiant }] });
    if (existingUser) {
      return res.status(409).json({ message: "User with this email or identifier already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(Password, 10);

    // Create new user object
    const newUser = new User({
      Name,
      Identifiant,
      Email,
      Password: hashedPassword,
      Classe: Role.includes("student") ? Classe : "", // Only add Classe if Role is student
      Role: Array.isArray(Role) ? Role : [Role], // Ensure Role is an array
      PhoneNumber,
      imageUrl: "",
      verified: true, // Assuming new users are verified by default
      enabled: Enabled,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Save the user to the database
    const savedUser = await newUser.save();
    
    // Send email notification
    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: savedUser.Email,
      subject: "Account Created",
      html: `<p>Your account has been created successfully. Follow this link to log in:</p><a href="${loginLink}">UniMindCare SignIn</a>`,
    };

    await transporter.sendMail(mailOptions);

    // Respond with the created user
    res.status(201).json(savedUser);
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/* GET all users listing. */
router.get("/", async function(req, res, next) {
  try {
    // Fetch all users from the database
    const users = await User.find({});
    
    // Send the list of users as a JSON response
    res.status(200).json(users);
  } catch (error) {
    // Handle errors
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/* GET users with enabled set to false. */
router.get("/disabled", async function(req, res, next) {
  try {
    // Fetch users where enabled is false
    const users = await User.find({ enabled: false });
    
    // Send the list of disabled users as a JSON response
    res.status(200).json(users);
  } catch (error) {
    // Handle errors
    console.error("Error fetching disabled users:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/* Enable a user account by ID. */
router.put("/enable/:id", async function(req, res, next) {
  try {
    const userId = req.params.id; // Get the user ID from the URL parameter

    // Update the user's enabled status to true
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { enabled: true } }, // Set enabled to true
      { new: true } // Return the updated user
    );

    // Check if the user was found and updated
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send the updated user as a JSON response
    res.status(200).json(updatedUser);

    // Send email notification
    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: updatedUser.Email,
      subject: "Account enabled",
      html: `<p>Follow this link to access your account:</p><a href="${loginLink}">UniMindCare SignIn</a>`
    };

    await transporter.sendMail(mailOptions);

  } catch (error) {
    // Handle errors
    console.error("Error enabling user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/* Disable a user account by ID. */
router.put("/disable/:id", async function(req, res, next) {
  try {
    const userId = req.params.id; // Get the user ID from the URL parameter

    // Update the user's enabled status to false
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { enabled: false } }, // Set enabled to false
      { new: true } // Return the updated user
    );

    // Check if the user was found and updated
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send the updated user as a JSON response
    res.status(200).json(updatedUser);

    // Send email notification
    const mailOptions = {
      from: `"UniMindCare" <${process.env.EMAIL_USER}>`,
      to: updatedUser.Email,
      subject: "Account disabled",
      html: "<p>Your account has been disabled by the administration! Contact them for more info...</p>"
    };

    await transporter.sendMail(mailOptions);

  } catch (error) {
    // Handle errors
    console.error("Error disabling user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/* Upload profile picture and update imageUrl */
router.put('/:identifiant/upload-profile-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    const { identifiant } = req.params;

    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune image fournie' });
    }

    // Find the user by Identifiant
    const user = await User.findOne({ Identifiant: identifiant });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Upload the file to Firebase Storage
    const fileName = `users/${identifiant}/profile/${Date.now()}_${req.file.originalname}`;
    const file = bucket.file(fileName);

    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    stream.on('error', (err) => {
      console.error('Erreur lors de l\'upload vers Firebase:', err);
      res.status(500).json({ message: 'Erreur lors de l\'upload de l\'image' });
    });

    stream.on('finish', async () => {
      // Make the file publicly accessible
      await file.makePublic();

      // Get the public URL
      const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      console.log('Image URL:', imageUrl);

      // Update the user's imageUrl in the database
      user.imageUrl = imageUrl;
      user.updatedAt = new Date();
      const updatedUser = await user.save();

      res.status(200).json(updatedUser);
    });

    stream.end(req.file.buffer);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'image de profil:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* Update user by Identifiant (supports updating password, phone number, etc.) */
router.put("/:identifiant", async function(req, res, next) {
  try {
    const identifiant = req.params.identifiant;
    const { currentPassword, Password, PhoneNumber } = req.body;

    // Find the user by Identifiant
    const user = await User.findOne({ Identifiant: identifiant });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If updating the password, verify the current password
    if (Password) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to update the password" });
      }

      // Verify the current password
      const isMatch = await bcrypt.compare(currentPassword, user.Password);
      if (!isMatch) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(Password, 10);
      user.Password = hashedPassword;
    }

    // Update other fields if provided
    if (PhoneNumber) {
      user.PhoneNumber = PhoneNumber;
    }

    // Update the updatedAt timestamp
    user.updatedAt = new Date();

    // Save the updated user
    const updatedUser = await user.save();

    // Send the updated user as a JSON response
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;