const mongoose = require('mongoose');
const Message = require('./Models/message');

mongoose
  .connect('mongodb://localhost/Pi-2025')
  .then(async () => {
    console.log('Connecté à MongoDB pour la migration');
    try {
      const result = await Message.updateMany(
        { read: { $exists: false } },
        { $set: { read: false } }
      );
      console.log(`Migration terminée. ${result.modifiedCount} messages mis à jour.`);
    } catch (error) {
      console.error('Erreur lors de la migration:', error);
    } finally {
      await mongoose.connection.close();
      console.log('Connexion MongoDB fermée après migration');
    }
  })
  .catch((error) => {
    console.error('Erreur de connexion à MongoDB:', error);
    process.exit(1);
  });