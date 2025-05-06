const { transporter } = require('../config/emailConfig');

/**
 * Send an email with retry mechanism
 * @param {Object} mailOptions - Nodemailer mail options
 * @param {Number} maxRetries - Maximum number of retries
 * @param {Number} initialDelay - Initial delay in ms
 * @returns {Promise<Object>} - Send info or error
 */
async function sendEmailWithRetry(mailOptions, maxRetries = 2, initialDelay = 1000) {
  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Wait before retrying (except on first attempt)
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }

      const info = await transporter.sendMail(mailOptions);
      return { success: true, info };
    } catch (error) {
      lastError = error;
      console.log(`Email attempt ${attempt + 1} failed: ${error.message}`);
      
      // If it's not a rate limiting error, don't retry
      if (error.responseCode !== 454 && error.code !== 'ECONNRESET' && 
          !error.message.includes('too many')) {
        break;
      }
    }
  }

  return { success: false, error: lastError };
}

module.exports = {
  sendEmailWithRetry
};