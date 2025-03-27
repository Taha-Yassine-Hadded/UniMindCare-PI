const request = require("supertest");
const app = require("../app"); // Adjust the path as needed
const { verifyTransporter } = require("../config/emailConfig"); // Import for test setup

describe("Basic Server Test", () => {
  beforeAll(async () => {
    // Wait for SMTP verification before running tests
    await verifyTransporter();
  }, 10000); // 10-second timeout for setup

  it("should return a response from the server", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBeGreaterThanOrEqual(200);
  });
});

afterAll(async () => {
  await app.closeAll();
}, 100000); // 100-second timeout for cleanup