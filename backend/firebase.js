// server/firebase.js
const admin = require('firebase-admin');

const serviceAccount = {
  "type": "service_account",
  "project_id": "faceattendacerealtime-573bc",
  "private_key_id": "6045d19455b210c96b74033124b87375b1c65e52",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCTxFfVvdJqssOu\n22VA1O9+jvLgxD2IOfz314mtPG2xMxsUq7SFxgy7EifgNwDGlVr+QWAkS8RPInbg\nJD75v3F/VU2YYb4uD/15bDb6TdRoOyRxXev3bz+xOLRS+pun9FEMj1mBcseo3sT2\n8XSJhij/XDKQD65AB5Y5jC9X3VqiLmf/s6iCZiELdhhLCjPTEpXVK6e+RKEKkQ8O\nc7bn6NCf82xHHlv8vICqYozdr+VAFRmb53Hi0ychyoZIG2wNpWaqAeO4nE2zsGpm\nbctnjtUtWZmkD+A++X7FGzjTQYguSJBtO/riqzNeG+P+S5W5SrxoCbWWPgPTRWWr\nzy+XQAb5AgMBAAECggEAJYVIjFR71m339DFvX2vyOB+SGnKZ8TpQOpp3Mg7TB5ij\nercyynkEiIfOqkctIj+QcFknUXAPs8xbhQSPHRl4d02wu02uXcHfqfJJb3tNwP2r\nfkHMBfMwqA5u81cBKT+HSPopTw5XFlEikFW1MqpnRJgjmqLwqv+CLLCk4NmrBt0A\nv9uQAhFMqQHgFM/Hdli1bNJQw3gySS8+U+aDheHGHsFTG/W6NyYSwTyyH1IX331E\nDcqLxbxyLe2B7aYdALoaxb5dlNpr3x/NF3o9oJTBcysHVdFVN9AyJgZcprdpGhkk\n1+27TDYomBvkPsyzbb8Lpu2swO+/gvBAgdt6rVWrZQKBgQDPUnc/Y0LpGJQ3o/Lh\n6mlitNOUgmbZ/r/B4haliIkGURLvGHkUKENm1t5wWjfQUWEhHjWRZ2lsv0dyHfNZ\nkIPmMeYr/SQ92YBdSIX6zeSWjjc+HnaCXRA24ZSA7J697rVrTMZf0sBaRPWkaMEy\nPE0dSl1GR+JWlwhsc14mCyvY6wKBgQC2djA2o1ccp0NktgvS+d9mZFv9LUxvqTMy\nBNR0RKnc2kreiozhHW726nYrEPcGZrl0TE3QDEchplfx8u2uW9qyyqPALLFiwxIw\nLAXLybPQE1nDBpTARjjQqWoIYx6pjNfhWFrZmQZzCel+I5Q7DZMhJ5dNb+roSGEq\nG7CMX3nmqwKBgBXPCPhECs/WZBEOUAhvzjIx72fZ59PatnVAwT0chb2CXcmE+4eh\nTKXOyIttEh350YvYT65CAJcN8AgTGnw7dYSLjzjlYiCXdqdZb66YZgloYGtKbRD9\nlS0QwbxmJ7S3HaJx6xQ9aTqVsnlfA6OzMDF6lyFDgo21SY+O+0JpPm2NAoGBAIh7\nc6kLGVgnjXPB8KpJml++5khFIA3OJKtfjYPC8MRwzNwWCzdAiwZLb0TblcvF/ycN\nBI+A/5weD1699igcMUTX6xEO3Ukg3XQHGfbL06LrNpN5Ur9YR5tdfiDz87Wj0r+P\nFbX6jyZx3aQq/PAHQWzlbnnQI4jIy1VyDOeTa12tAoGAc+ZNKwPQN1SA2LM2e0D8\nbNr5QebUJWnw5SYDbQaqMminq1gyjEkQWSxDi+riq4TsBcbVLcV/pBKnVgioe1ye\n+BKIFG1qybGuNk/eRWqW1JTmbZdXtfJrBf0DYbpeLgSL3xwKYUEJk9FKRo1ap/8Q\nbTmVrFZeF/Y+qumR/ZDr7oI=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-l3uwy@faceattendacerealtime-573bc.iam.gserviceaccount.com",
  "client_id": "106090743333742888932",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-l3uwy%40faceattendacerealtime-573bc.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "faceattendacerealtime-573bc.appspot.com"
});

const bucket = admin.storage().bucket();

module.exports = { admin, bucket };
