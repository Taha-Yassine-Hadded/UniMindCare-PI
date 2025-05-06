const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const router = require('../routes/feedbackRoutes'); // Chemin vers le fichier de route
const Feedback = require('../Models/Feedback');
const Users = require('../Models/Users');

// Mocks pour les modèles
jest.mock('../Models/Feedback');
jest.mock('../Models/Users');
jest.mock('jsonwebtoken');

// Extraire les middlewares directement depuis le fichier de route
const { logger, authenticateToken } = require('../routes/feedbackRoutes');

// Vérifier que les middlewares sont définis
if (!logger || !authenticateToken) {
  console.error('Erreur: logger ou authenticateToken non défini dans feedbackRoutes.js');
}

// Variables globales
let mongod;
let app;

// Configuration de l'application Express
const setupApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/feedback', router);
  return app;
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  app = setupApp();
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongod.stop();
});

describe('Tests des routes et middlewares de feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  // Test 1: GET /api/feedback/teachers
  test('GET /api/feedback/teachers - doit retourner la liste des enseignants distincts', async () => {
    Feedback.distinct.mockResolvedValue(['Professeur A', 'Professeur B']);
    const response = await request(app).get('/api/feedback/teachers');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ teachers: ['Professeur A', 'Professeur B'] });
    expect(Feedback.distinct).toHaveBeenCalledWith('nomEnseignant');
  });

  // Test 2: GET /api/feedback/teachers - erreur serveur
  test('GET /api/feedback/teachers - doit retourner une erreur 500 en cas de problème', async () => {
    Feedback.distinct.mockRejectedValue(new Error('Erreur base de données'));
    const response = await request(app).get('/api/feedback/teachers');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Erreur interne du serveur' });
  });

  // Test 3: Middleware logger
  test('Middleware logger - doit logger les données et appeler next', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/test', logger, (req, res) => {
      res.status(200).json({ message: 'OK' });
    });

    const response = await request(testApp)
      .post('/test')
      .send({ test: 'data' });

    expect(response.status).toBe(200);
    expect(consoleLogSpy).toHaveBeenCalledWith('Données reçues :', { test: 'data' });
  });

  // Test 4: Middleware authenticateToken - token manquant
  test('Middleware authenticateToken - doit retourner 401 si token manquant', async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.get('/test', authenticateToken, (req, res) => {
      res.status(200).json({ message: 'OK' });
    });

    const response = await request(testApp).get('/test');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Token manquant' });
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  // Test 5: Middleware authenticateToken - token invalide
  test('Middleware authenticateToken - doit retourner 401 pour token invalide', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('Token invalide');
    });

    const testApp = express();
    testApp.use(express.json());
    testApp.get('/test', authenticateToken, (req, res) => {
      res.status(200).json({ message: 'OK' });
    });

    const response = await request(testApp)
      .get('/test')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Token invalide' });
    expect(jwt.verify).toHaveBeenCalled();
  });
});