const express = require('express');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');

const app = express();

/* ================= Middleware ================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

/* ================= MongoDB Config ================= */
// IMPORTANT: works both locally & in Docker
const MONGO_DB_HOST = process.env.MONGO_DB_HOST || 'localhost';
const MONGO_DB_USER = process.env.MONGO_DB_USER || 'admin';
const MONGO_DB_PASSWORD = process.env.MONGO_DB_PASSWORD || 'password';

// authSource=admin is REQUIRED for root user
const MONGO_URL = `mongodb://${MONGO_DB_USER}:${MONGO_DB_PASSWORD}@${MONGO_DB_HOST}:27017/?authSource=admin`;

const DATABASE_NAME = 'user-account';
const COLLECTION_NAME = 'users';

let client;
let usersCollection;

/* ================= Connect DB ================= */
async function connectDB() {
  try {
    client = new MongoClient(MONGO_URL);
    await client.connect();
    const db = client.db(DATABASE_NAME);
    usersCollection = db.collection(COLLECTION_NAME);
    console.log('✅ Connected to MongoDB');
    console.log('THis is CHnaged')
  } catch (err) {
    console.error('❌ MongoDB connection failed, retrying...', err.message);
    setTimeout(connectDB, 5000);
  }
}

/* ================= Routes ================= */

// Home
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Profile image
app.get('/profile-picture', (req, res) => {
  try {
    const img = fs.readFileSync(path.join(__dirname, 'profile-1.jpg'));
    res.writeHead(200, { 'Content-Type': 'image/jpg' });
    res.end(img, 'binary');
  } catch {
    res.status(404).send('Image not found');
  }
});

// Get profile
app.get('/get-profile', async (req, res) => {
  if (!usersCollection) {
    return res.status(503).json({ error: 'Database not ready' });
  }

  try {
    const user = await usersCollection.findOne({ userid: 1 });
    res.json(user || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update / insert profile
app.post('/update-profile', async (req, res) => {
  if (!usersCollection) {
    return res.status(503).json({ error: 'Database not ready' });
  }

  try {
    const user = {
      userid: 1,
      name: req.body.name,
      email: req.body.email,
      interests: req.body.interests
    };

    await usersCollection.updateOne(
      { userid: 1 },
      { $set: user },
      { upsert: true }
    );

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= Start Server ================= */
async function startServer() {
  await connectDB();
  app.listen(3000, () => {
    console.log('🚀 App listening on port 3000');
  });
}

// Start the server only after DB connection
startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
