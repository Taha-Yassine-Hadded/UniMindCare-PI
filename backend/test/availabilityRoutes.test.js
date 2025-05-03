const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../app'); // <-- Correction ici
const Availability = require('../Models/Availability');

describe('Availability Routes', () => {
  let psychologistId;
  let availabilityId;

  beforeAll(() => {
    psychologistId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await Availability.deleteMany({});
    await mongoose.connection.close();
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
      .query({ psychologistId: psychologistId.toString() }); // <-- Correction ici
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