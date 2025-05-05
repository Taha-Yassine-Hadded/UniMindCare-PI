const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const availabilityRoutes = require('../routes/availabilityRoutes');
const Availability = require('../Models/Availability');

let mongod;
let app;

// Configure Express app for tests
const setupApp = () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/availability', availabilityRoutes);
  return app;
};

describe('Availability Routes', () => {
  let psychologistId;
  let availabilityId;

  beforeAll(async () => {
    // Start MongoMemoryServer
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    console.log('MongoMemoryServer URI:', uri); // Debug

    // Disconnect any existing connections
    await mongoose.disconnect();

    // Connect Mongoose to the in-memory database
    await mongoose.connect(uri);

    // Create the Express app
    app = setupApp();

    // Generate a psychologistId for tests
    psychologistId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    // Clean up
    await Availability.deleteMany({});
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    // Clear the collection before each test
    await Availability.deleteMany({});
  });

  it('should add a new availability slot', async () => {
    const res = await request(app)
      .post('/api/availability')
      .send({
        psychologistId,
        startTime: new Date(Date.now() + 3600000), // 1 hour from now
        endTime: new Date(Date.now() + 7200000), // 2 hours from now
        status: 'available',
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.psychologistId).toBe(psychologistId.toString());
    availabilityId = res.body._id;
  });

  it('should get availability for a psychologist', async () => {
    // Add a test availability
    const availability = new Availability({
      psychologistId,
      startTime: new Date(Date.now() + 3600000),
      endTime: new Date(Date.now() + 7200000),
      status: 'available',
    });
    await availability.save();

    const res = await request(app)
      .get('/api/availability')
      .query({ psychologistId: psychologistId.toString() });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should update an availability slot', async () => {
    // Add a test availability
    const availability = new Availability({
      psychologistId,
      startTime: new Date(Date.now() + 3600000),
      endTime: new Date(Date.now() + 7200000),
      status: 'available',
    });
    await availability.save();
    availabilityId = availability._id;

    const res = await request(app)
      .put(`/api/availability/${availabilityId}`)
      .send({ status: 'blocked', reason: 'Test block' });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('blocked');
    expect(res.body.reason).toBe('Test block');
  });

  it('should delete an availability slot', async () => {
    // Add a test availability
    const availability = new Availability({
      psychologistId,
      startTime: new Date(Date.now() + 3600000),
      endTime: new Date(Date.now() + 7200000),
      status: 'available',
    });
    await availability.save();
    availabilityId = availability._id;

    const res = await request(app)
      .delete(`/api/availability/${availabilityId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Availability slot removed');
  });
});