const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const crisisRoutes = require('../../routes/crisisData');

let mongod;
let app;

// Configuration de l'app Express pour les tests
const setupApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/crisis', crisisRoutes);
  return app;
};

beforeAll(async () => {
  // Démarrage d'un serveur MongoDB en mémoire pour les tests
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Connexion à MongoDB en mémoire
  await mongoose.connect(uri);

  // Création de l'application
  app = setupApp();
});

afterAll(async () => {
  // Fermeture de la connexion à MongoDB et arrêt du serveur
  await mongoose.connection.close();
  await mongod.stop();
});

describe('Tests des routes de crisisData', () => {
  let mockCrisisData;

  beforeEach(async () => {
    // Mock pour les données de crise
    mockCrisisData = {
      identifiant: '233alt014',
      etat: 'normal',
      confidence_percent: 95.5,
      last_update: new Date().toISOString(),
      zones_a_risque: ['tête', 'ventre'],
      recommendations: ['Repos', 'Hydratation'],
    };

    // Insérer les données de test avant chaque test
    await mongoose.connection.db.collection('CrisisResultats').insertOne(mockCrisisData);
  });

  afterEach(async () => {
    // Nettoyer la collection après chaque test
    await mongoose.connection.db.collection('CrisisResultats').deleteMany({});
  });

  test('GET /api/crisis/student/:identifiant - doit retourner les données de crise d\'un étudiant existant', async () => {
    const response = await request(app).get('/api/crisis/student/233alt014');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('identifiant', '233alt014');
    expect(response.body).toHaveProperty('etat');
    expect(response.body).toHaveProperty('confidence_percent');
  });

  test('GET /api/crisis/student/:identifiant - doit retourner 404 pour un identifiant inexistant', async () => {
    const response = await request(app).get('/api/crisis/student/utilisateur_inexistant');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message', 'Aucune donnée de santé trouvée pour cet étudiant');
  });

  test('GET /api/crisis/student/:identifiant - doit gérer les erreurs internes', async () => {
    jest.spyOn(mongoose.connection.db, 'collection').mockImplementationOnce(() => {
      throw new Error('Erreur simulée');
    });

    const response = await request(app).get('/api/crisis/student/233alt014');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('message', 'Erreur serveur');
  });
});