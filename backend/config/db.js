const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: "Pi_2025" // Assure-toi d'utiliser la bonne casse ici
        });
        console.log("MongoDB Connected...");
    } catch (err) {
        console.error("Erreur de connexion à MongoDB :", err);
        process.exit(1);
    }
};

module.exports = connectDB;
