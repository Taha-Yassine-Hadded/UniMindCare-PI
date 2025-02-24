const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app'); // Adjust the path as needed

describe('Basic Server Test', () => {
  it('should return a response from the server', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBeGreaterThanOrEqual(200); // Any valid status
  });
});

// Ensure the app is properly closed after tests
afterAll(async () => {
  await mongoose.connection.close();
});