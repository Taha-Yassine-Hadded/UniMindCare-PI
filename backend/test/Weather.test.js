const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const weatherRoutes = require('../routes/Weather');

let mongod;
let app;

// Configuration de l'app Express pour les tests
const setupApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/weather', weatherRoutes);
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

describe('Tests des routes de Weather', () => {
  let mockWeatherData;

  beforeEach(async () => {
    // Date d'aujourd'hui au format YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    // Mock pour les données météo
    mockWeatherData = {
      day: today,
      time_slot: 'matin',
      mesures: {
        temperature: 25.5,
        humidity: 65.3,
      },
      recommandation: {
        id: 1,
        type: 'advice',
        title: 'Journée ensoleillée',
        description: 'Profitez du beau temps!',
        url: '',
        stats: {
          temperature: 25.5,
          humidity: 65.3,
        },
      },
    };

    // Insérer les données de test avant chaque test
    await mongoose.connection.db.collection('recommandations_weather').insertOne(mockWeatherData);
  });

  afterEach(async () => {
    // Nettoyer la collection après chaque test
    await mongoose.connection.db.collection('recommandations_weather').deleteMany({});
  });

  test('GET /api/weather/latest - doit retourner les données météo du jour', async () => {
    const response = await request(app).get('/api/weather/latest');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('day');
    expect(response.body).toHaveProperty('time_slot');
    expect(response.body).toHaveProperty('mesures');
    expect(response.body.mesures).toHaveProperty('temperature');
    expect(response.body.mesures).toHaveProperty('humidity');
  });

  test('GET /api/weather/latest?timeSlot=matin - doit retourner les données météo du matin', async () => {
    const response = await request(app).get('/api/weather/latest?timeSlot=matin');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('time_slot', 'matin');
  });

  test('GET /api/weather/latest - doit gérer l\'absence de données', async () => {
    await mongoose.connection.db.collection('recommandations_weather').deleteMany({});

    const response = await request(app).get('/api/weather/latest');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message', 'Aucune donnée météo disponible');
  });

  test('GET /api/weather/latest - doit gérer les erreurs internes', async () => {
    jest.spyOn(mongoose.connection.db, 'collection').mockImplementationOnce(() => {
      throw new Error('Erreur simulée');
    });

    const response = await request(app).get('/api/weather/latest');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('message', 'Erreur serveur');
  });

  test('GET /api/weather/period - doit retourner les données météo d\'une période spécifique', async () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Nettoyer la collection avant d'insérer les données de test
    await mongoose.connection.db.collection('recommandations_weather').deleteMany({});

    // Créer de nouveaux documents sans _id pour éviter les erreurs de duplication
    const testData = [
      { ...mockWeatherData, _id: undefined, day: yesterday, time_slot: 'matin' },
      { ...mockWeatherData, _id: undefined, day: today, time_slot: 'matin' },
    ];

    await mongoose.connection.db.collection('recommandations_weather').insertMany(testData);

    const response = await request(app).get(`/api/weather/period?startDate=${yesterday}&endDate=${today}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBe(2); // Attendre exactement 2 documents
  });

  test('GET /api/weather/period - doit gérer l\'absence de données pour une période', async () => {
    await mongoose.connection.db.collection('recommandations_weather').deleteMany({});

    const response = await request(app).get('/api/weather/period?startDate=2023-01-01');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message', 'Aucune donnée météo disponible pour cette période');
  });

 /* test('POST /api/weather/add - doit permettre d\'ajouter une nouvelle recommandation météo', async () => {
    const newWeatherData = {
      day: '2025-05-02',
      time_slot: 'matin',
      temperature: 22.5,
      humidity: 75.0,
      title: 'Journée fraîche',
      description: 'Prévoir un léger pull.',
    };

    const response = await request(app).post('/api/weather/add').send(newWeatherData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message', 'Recommandation météo ajoutée avec succès');
    expect(response.body).toHaveProperty('id');

    const inserted = await mongoose.connection.db.collection('recommandations_weather').findOne({ day: '2025-05-02' });
    expect(inserted).toBeTruthy();
    expect(inserted.time_slot).toBe('matin');
    expect(inserted.mesures.temperature).toBe(22.5);
  });

  test('POST /api/weather/add - doit rejeter les données invalides', async () => {
    const invalidData = {
      day: '2025-05-02',
      temperature: 22.5,
    };

    const response = await request(app).post('/api/weather/add').send(invalidData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message', 'Données incomplètes');
  });*/
});