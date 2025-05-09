const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const availabilityRoutes = require('../routes/availabilityRoutes');
const Availability = require('../Models/Availability');

let mongod;
let app;

describe('Availability Routes', () => {
  let psychologistId;
  let availabilityId;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);

    // Setup Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/availability', availabilityRoutes);

    psychologistId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await Availability.deleteMany({});
    await mongoose.connection.close();
    await mongod.stop();
  });

  it('should add a new availability slot', async () => {
    const res = await request(app)
      .post('/api/availability')
      .send({
        psychologistId,
        startTime: new Date(Date.now() + 3600000),
        endTime: new Date(Date.now() + 7200000),
        status: 'available'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.psychologistId).toBe(psychologistId.toString());
    availabilityId = res.body._id;
  });

  it('should get availability for a psychologist', async () => {
    const res = await request(app)
      .get('/api/availability')
      .query({ psychologistId: psychologistId.toString() });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should update an availability slot', async () => {
    const res = await request(app)
      .put(`/api/availability/${availabilityId}`)
      .send({ status: 'blocked', reason: 'Test block' });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('blocked');
    expect(res.body.reason).toBe('Test block');
  });

  it('should delete an availability slot', async () => {
    const res = await request(app)
      .delete(`/api/availability/${availabilityId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Availability slot removed');
  });
});