var express = require("express");
var router = express.Router();
const User = require("../Models/Users"); // Import the User model
const { transporter } = require("../config/emailConfig");
const loginLink = "http://localhost:3000/tivo/authentication/login-simple";
const bcrypt = require("bcryptjs");
const { validateToken } = require('../middleware/authentication');
const multer = require('multer'); // For handling file uploads
const {bucket} = require('../firebase'); // Firebase Storage bucket
const Post = require('../Models/Post'); // Import the Post model
const passport = require('./passportConfig');
const InappropriateComment = require('../Models/InappropriateComment');


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

router.put("/:identifiant", async (req, res, next) => {
  try {
    const identifiant = req.params.identifiant;
    const { currentPassword, newPassword } = req.body;

    console.log("Request body:", { currentPassword: !!currentPassword, newPassword: !!newPassword });

    const user = await User.findOne({ Identifiant: identifiant });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Only proceed if newPassword is provided
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to update the password" });
      }
      
      const isMatch = await bcrypt.compare(currentPassword, user.Password);
      if (!isMatch) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      user.Password = await bcrypt.hash(newPassword, 10);
      user.updatedAt = new Date();
      
      const updated = await user.save();
      res.status(200).json(updated);
    } else {
      res.status(400).json({ message: "New password is required for password update" });
    }
  } catch (err) {
    console.error("Error updating user password:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// Add these routes to your users.js file

// Get all users for admin with inappropriate comment counts
router.get('/admin', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    // Verify admin access
    if (!req.user.Role || !req.user.Role.includes('admin')) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Get all users with their inappropriate comment counts
    const users = await User.find({}, {
      Name: 1,
      Email: 1,
      Role: 1,
      enabled: 1,
      inappropriateCommentsCount: 1,
      lastInappropriateComment: 1
    }).sort({ inappropriateCommentsCount: -1 });

    res.status(200).json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Get bad comments for a specific user
// Add this to your imports at the top

// Update the bad comments route
router.get('/:id/bad-comments', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    // Verify admin access
    if (!req.user.Role || !req.user.Role.includes('admin')) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    // Get inappropriate comments from the dedicated collection
    const inappropriateComments = await InappropriateComment.find({ 
      author: req.params.id 
    }).sort({ createdAt: -1 });
    
    // Also find flagged comments in posts
    const posts = await Post.find({ 'comments.author': req.params.id });
    
    const flaggedComments = [];
    posts.forEach(post => {
      post.comments.forEach(comment => {
        if (comment.author.toString() === req.params.id && comment.isInappropriate) {
          flaggedComments.push({
            _id: comment._id,
            content: comment.content,
            createdAt: comment.createdAt,
            flaggedAt: comment.flaggedAt,
            flagReason: comment.flagReason,
            postId: post._id,
            postTitle: post.title
          });
        }
      });
    });
    
    // Combine both types of inappropriate comments
    const allBadComments = [
      ...inappropriateComments.map(comment => ({
        _id: comment._id,
        content: comment.content,
        createdAt: comment.createdAt,
        postId: comment.postId,
        postTitle: comment.postTitle,
        flagReason: comment.reason,
        type: 'Bloqué'  // This comment was blocked before posting
      })),
      ...flaggedComments.map(comment => ({
        ...comment,
        type: 'Signalé'  // This comment was flagged after posting
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.status(200).json(allBadComments);
  } catch (error) {
    console.error('Erreur lors de la récupération des commentaires inappropriés:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Toggle user status (enable/disable)
// Update the toggle user status route to reset counter when enabling a user

router.put('/:id/status', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    // Vérifier si l'utilisateur est admin
    if (!req.user.Role || !req.user.Role.includes('admin')) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const { enabled } = req.body;
    if (enabled === undefined) {
      return res.status(400).json({ message: 'Le statut enabled est requis' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

     // Check if this is a reactivation (was disabled, now being enabled)
     const isReactivation = !user.enabled && enabled === true;

    user.enabled = enabled;
    
    // Reset inappropriate comment counter when re-enabling a user
    if (enabled === true) {
      user.inappropriateCommentsCount = 0;
      user.lastInappropriateComment = null;
    }
    
    await user.save();

     // Send email notification if this is a reactivation after violations
     if (isReactivation) {
      try {
        const mailOptions = {
          from: `"UniMindCare Administration" <${process.env.EMAIL_USER}>`,
          to: user.Email,
          subject: 'Votre compte a été réactivé - AVERTISSEMENT',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <h2 style="color: #1976d2;">Votre compte a été réactivé</h2>
              <p>Cher(e) ${user.Name},</p>
              <p>Nous vous informons que votre compte UniMindCare a été réactivé par l'administrateur.</p>
              
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 15px 0; color: #856404;">
                <h3 style="margin-top: 0;">⚠️ AVERTISSEMENT IMPORTANT</h3>
                <p>Votre compte avait été désactivé en raison de <strong>commentaires inappropriés</strong> qui ne respectent pas nos règles communautaires.</p>
                <p>Nous vous rappelons que tout contenu inapproprié, offensant, ou nuisible n'est pas toléré sur notre plateforme.</p>
                <p><strong>En cas de récidive :</strong></p>
                <ul>
                  <li>Votre compte sera définitivement désactivé</li>
                  <li>L'administration prendra des mesures disciplinaires supplémentaires</li>
                </ul>
              </div>
               <p>Nous vous invitons à consulter nos <a href="http://localhost:3000/blog" style="color: #1976d2;">règles communautaires</a> pour plus d'informations.</p>
              <p>Si vous avez des questions, n'hésitez pas à contacter l'administration.</p>
              
              <p style="margin-top: 20px;">Cordialement,</p>
              <p style="font-weight: bold; margin-top: 5px;">L'équipe UniMindCare</p>
            </div>
          `
        };
        await transporter.sendMail(mailOptions);
        console.log(`Email d'avertissement envoyé à l'utilisateur réactivé: ${user.Email}`);
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'email de réactivation:', emailError);
        // Continue execution despite email error
      }
    }

    res.status(200).json({ 
      message: `Utilisateur ${enabled ? 'activé' : 'désactivé'} avec succès${enabled ? ' et compteur de commentaires inappropriés réinitialisé' : ''}`,
      user: {
        _id: user._id,
        Name: user.Name,
        Email: user.Email,
        enabled: user.enabled,
        inappropriateCommentsCount: user.inappropriateCommentsCount,
        Role: user.Role
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
