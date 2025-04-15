module.exports = {
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER
    },
    email: {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
      from: process.env.EMAIL_FROM || '"UniMindCare" <no-reply@unimindcare.com>'
    }
  };