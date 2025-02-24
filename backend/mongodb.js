require('dotenv').config();


const { MongoClient } = require('mongodb');




const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
  try {
    await client.connect();
    console.log("Connected to database");
    const database = client.db('Pi_2025');
    const collection = database.collection('myCollection');

    const user = { name: "John Doe" };
    const result = await collection.insertOne(user);

    console.log(`New user created with the following id: ${result.insertedId}`);
  } catch (error) {
    console.error("Error inserting user:", error);
  } finally {
    await client.close();
  }
}

run().catch(console.dir);