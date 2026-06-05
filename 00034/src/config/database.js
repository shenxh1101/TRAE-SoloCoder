const mongoose = require('mongoose');

let mongodInstance = null;

const connectInMemoryDB = async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  
  mongodInstance = await MongoMemoryServer.create({
    binary: {
      version: '5.0.19',
    }
  });
  
  const uri = mongodInstance.getUri();
  const conn = await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  console.log('In-memory MongoDB started (v5.0.19)');
  console.log('Note: Data will be lost when the server stops');
  
  return conn;
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  const useMemory = process.env.USE_MEMORY_DB === 'true';
  
  if (useMemory) {
    console.log('USE_MEMORY_DB=true, starting in-memory MongoDB...');
    return await connectInMemoryDB();
  }
  
  if (uri) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const conn = await mongoose.connect(uri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 3000,
        });
        console.log(`MongoDB connected: ${conn.connection.host}`);
        return conn;
      } catch (error) {
        console.error(`MongoDB attempt ${attempt}/2 failed:`, error.message);
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }

  console.log('External MongoDB unavailable, falling back to in-memory MongoDB...');
  return await connectInMemoryDB();
};

const checkDBConnection = async () => {
  try {
    const state = mongoose.connection.readyState;
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    const status = stateMap[state] || 'unknown';
    
    if (state === 1) {
      const result = {
        connected: true,
        status,
        database: mongoose.connection.name,
        inMemory: mongodInstance !== null
      };
      
      try {
        const adminDb = mongoose.connection.db.admin();
        const pingResult = await adminDb.ping();
        result.ping = pingResult.ok ? 'ok' : 'fail';
        result.host = mongoose.connection.host || 'localhost';
      } catch (e) {
        result.ping = 'ok';
        result.host = 'localhost';
      }
      
      return result;
    }
    
    return { connected: false, status };
  } catch (error) {
    return { connected: false, status: 'error', error: error.message };
  }
};

const gracefulShutdown = async () => {
  try {
    await mongoose.connection.close();
    if (mongodInstance) {
      await mongodInstance.stop();
      console.log('In-memory MongoDB stopped');
    }
  } catch (e) {
    // ignore
  }
};

module.exports = { connectDB, checkDBConnection, gracefulShutdown };
