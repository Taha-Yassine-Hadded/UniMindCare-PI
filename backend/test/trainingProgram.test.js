const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const router = require('../routes/TeacherTrainingRoutes/trainingProgram');
const { TrainingProgram, TrainingContent } = require('../Models/TeacherTraining/TrainingModels');
const jwt = require('jsonwebtoken');

// Define mock user ID
const mockUserId = new mongoose.Types.ObjectId().toString();

// Mock middleware
jest.mock('../middleware/authentication', () => ({
  validateToken: (req, res, next) => {
    req.user = { userId: mockUserId };
    next();
  },
  authorizeRoles: jest.fn(() => (req, res, next) => next()),
}));

// Mock multer
jest.mock('multer', () => {
  const multerMock = () => ({
    single: () => (req, res, next) => {
      req.file = {
        filename: 'test-image.jpg',
      };
      next();
    },
  });
  multerMock.diskStorage = jest.fn(() => ({
    destination: jest.fn(),
    filename: jest.fn(),
  }));
  multerMock.memoryStorage = jest.fn();
  return multerMock;
});

describe('Program Routes', () => {
  let app;
  let mongoServer;
  let programId;

  beforeAll(async () => {
    // Set up in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Set up Express app
    app = express();
    app.use(express.json());
    app.use('/api/programs', router);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await TrainingProgram.deleteMany({});
    await TrainingContent.deleteMany({});
  });

  describe('POST /api/programs', () => {
    it('should create a new program', async () => {
      const programData = {
        title: 'Test Program',
        description: 'A test training program',
      };

      const response = await request(app)
        .post('/api/programs')
        .send(programData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.title).toBe(programData.title);
      expect(response.body.description).toBe(programData.description);
      expect(response.body.psychologistId).toBe(mockUserId);
      expect(response.body.imgUrl).toBe('/uploads/program-images/test-image.jpg');

      programId = response.body._id;
    });
  });

  describe('GET /api/programs/my-programs', () => {
    it('should return programs for the authenticated user', async () => {
      const program = new TrainingProgram({
        title: 'My Program',
        description: 'User program',
        psychologistId: mockUserId,
      });
      await program.save();

      const content = new TrainingContent({
        title: 'Test Content',
        type: 'pdf',
        trainingProgramId: program._id,
      });
      await content.save();

      const response = await request(app)
        .get('/api/programs/my-programs')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('My Program');
      expect(response.body[0].contents).toHaveLength(1);
      expect(response.body[0].contents[0].title).toBe('Test Content');
    });

    it('should return empty array if no programs exist', async () => {
      const response = await request(app)
        .get('/api/programs/my-programs')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/programs/all-programs', () => {
    it('should return all programs', async () => {
      const program1 = new TrainingProgram({
        title: 'Program 1',
        description: 'First program',
        psychologistId: mockUserId,
      });
      const program2 = new TrainingProgram({
        title: 'Program 2',
        description: 'Second program',
        psychologistId: new mongoose.Types.ObjectId(),
      });
      await Promise.all([program1.save(), program2.save()]);

      const response = await request(app)
        .get('/api/programs/all-programs')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.map(p => p.title)).toContain('Program 1');
      expect(response.body.map(p => p.title)).toContain('Program 2');
    });
  });

  describe('GET /api/programs/:id', () => {
    it('should return a specific program', async () => {
      const program = new TrainingProgram({
        title: 'Specific Program',
        description: 'Detailed program',
        psychologistId: mockUserId,
      });
      await program.save();

      const response = await request(app)
        .get(`/api/programs/${program._id}`)
        .expect(200);

      expect(response.body.title).toBe('Specific Program');
      expect(response.body.description).toBe('Detailed program');
    });

    it('should return 404 for non-existent program', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/programs/${nonExistentId}`)
        .expect(404);

      expect(response.body.message).toBe('Program not found');
    });
  });
});