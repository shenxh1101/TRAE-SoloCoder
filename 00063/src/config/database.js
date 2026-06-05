const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

let mongoServer = null;

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

async function connectExternalDB(uri) {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 3000,
    maxPoolSize: 10
  });
  console.log(`MongoDB Connected: ${mongoose.connection.host}`);
}

async function connectMemoryDB() {
  let MongoMemoryServer;
  try {
    MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer;
  } catch (e) {
    throw new Error('mongodb-memory-server 未安装，请运行: npm install mongodb-memory-server');
  }

  const systemBinary = findSystemBinary();
  if (systemBinary && !process.env.MONGOMS_SYSTEM_BINARY) {
    process.env.MONGOMS_SYSTEM_BINARY = systemBinary;
    const match = systemBinary.match(/(\d+\.\d+\.\d+)$/);
    if (match && !process.env.MONGOMS_VERSION) {
      process.env.MONGOMS_VERSION = match[1];
    }
  }

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log('MongoDB In-Memory Connected (无需外部MongoDB实例)');
}

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;

  const externalURI = process.env.MONGODB_URI;

  if (externalURI && !process.env.USE_MEMORY_DB) {
    try {
      await connectExternalDB(externalURI);
      return;
    } catch (err) {
      console.warn(`外部MongoDB连接失败 (${err.message})，尝试内存数据库...`);
    }
  }

  try {
    await connectMemoryDB();
  } catch (err) {
    console.error('Database connection error:', err.message);
    console.error('请确保: 1) MongoDB服务正在运行, 或 2) mongodb-memory-server 已安装');
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('MongoDB Disconnected');
    }
  } catch (error) {
    console.error('Error disconnecting from database:', error.message);
  }
  if (mongoServer) {
    await mongoServer.stop().catch(() => {});
    mongoServer = null;
  }
};

module.exports = { connectDB, disconnectDB };
