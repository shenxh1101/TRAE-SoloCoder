const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer = null;
let connected = false;

const SYSTEM_BINARY_PATHS = [
  path.join(process.env.HOME || '', '.cache/mongodb-binaries/mongod-arm64-darwin-5.0.19'),
  '/opt/homebrew/bin/mongod',
  '/usr/local/bin/mongod',
];

function findSystemBinary() {
  for (const p of SYSTEM_BINARY_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    connected = true;
    return true;
  }

  const systemBinary = findSystemBinary();
  if (systemBinary && !process.env.MONGOMS_SYSTEM_BINARY) {
    process.env.MONGOMS_SYSTEM_BINARY = systemBinary;
    const match = systemBinary.match(/(\d+\.\d+\.\d+)$/);
    if (match && !process.env.MONGOMS_VERSION) {
      process.env.MONGOMS_VERSION = match[1];
    }
  }

  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    connected = true;
    return true;
  } catch (err) {
    console.error('MongoMemoryServer unavailable:', err.message);
    connected = false;
    return false;
  }
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop().catch(() => {});
    mongoServer = null;
  }
  connected = false;
}

async function clearDB() {
  if (mongoose.connection.readyState !== 1) return;
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({}).catch(() => {});
  }
}

function isConnected() {
  return connected;
}

module.exports = { connectDB, disconnectDB, clearDB, isConnected };
