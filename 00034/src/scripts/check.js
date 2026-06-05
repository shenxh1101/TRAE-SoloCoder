const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const SRC_DIR = path.join(__dirname, '..');

const checkEnv = () => {
  const required = ['MONGODB_URI'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('❌ 缺少必要环境变量:', missing.join(', '));
    console.error('请在 .env 文件中配置以上变量');
    return false;
  }
  console.log('✅ 环境变量检查通过');
  console.log(`   MONGODB_URI: ${process.env.MONGODB_URI}`);
  console.log(`   USE_MEMORY_DB: ${process.env.USE_MEMORY_DB || 'false'}`);
  return true;
};

const checkDB = async () => {
  const useMemory = process.env.USE_MEMORY_DB === 'true';
  
  if (useMemory) {
    try {
      console.log('正在启动内存数据库 (mongodb-memory-server)...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create({
        binary: { version: '5.0.19' }
      });
      const uri = mongod.getUri();
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      console.log('✅ 内存数据库连接成功');
      console.log(`   数据库: ${mongoose.connection.name}`);
      await mongoose.connection.close();
      await mongod.stop();
      return true;
    } catch (error) {
      console.error('❌ 内存数据库启动失败:', error.message);
      return false;
    }
  }

  try {
    console.log('正在检查外部 MongoDB 连接...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 3000,
    });
    console.log('✅ 外部 MongoDB 连接成功');
    console.log(`   主机: ${mongoose.connection.host}`);
    console.log(`   数据库: ${mongoose.connection.name}`);
    await mongoose.connection.close();
    return true;
  } catch (error) {
    console.error('❌ 外部 MongoDB 连接失败:', error.message);
    console.error('   设置 USE_MEMORY_DB=true 使用内存数据库');
    return false;
  }
};

const checkModules = () => {
  const requiredModules = [
    'express', 'mongoose', 'node-cron', 'json2csv', 'dotenv', 'cors',
    'mongodb-memory-server'
  ];
  const missing = [];
  for (const mod of requiredModules) {
    try {
      require.resolve(mod);
    } catch (e) {
      missing.push(mod);
    }
  }
  if (missing.length > 0) {
    console.error('❌ 缺少依赖模块:', missing.join(', '));
    console.error('请运行: npm install');
    return false;
  }
  console.log('✅ 依赖模块检查通过');
  return true;
};

const checkModels = () => {
  try {
    require(path.join(SRC_DIR, 'models/User'));
    require(path.join(SRC_DIR, 'models/PointsRecord'));
    require(path.join(SRC_DIR, 'models/Gift'));
    require(path.join(SRC_DIR, 'models/Coupon'));
    require(path.join(SRC_DIR, 'models/Order'));
    require(path.join(SRC_DIR, 'models/ExchangeRecord'));
    console.log('✅ 数据模型加载正常');
    return true;
  } catch (error) {
    console.error('❌ 数据模型加载失败:', error.message);
    return false;
  }
};

const checkRoutes = () => {
  try {
    require(path.join(SRC_DIR, 'routes/userRoutes'));
    require(path.join(SRC_DIR, 'routes/pointsRoutes'));
    require(path.join(SRC_DIR, 'routes/giftRoutes'));
    require(path.join(SRC_DIR, 'routes/couponRoutes'));
    require(path.join(SRC_DIR, 'routes/orderRoutes'));
    require(path.join(SRC_DIR, 'routes/reportRoutes'));
    console.log('✅ 路由模块加载正常');
    return true;
  } catch (error) {
    console.error('❌ 路由模块加载失败:', error.message);
    return false;
  }
};

const checkServices = () => {
  try {
    require(path.join(SRC_DIR, 'services/pointsService'));
    require(path.join(SRC_DIR, 'services/giftService'));
    require(path.join(SRC_DIR, 'services/couponService'));
    require(path.join(SRC_DIR, 'services/orderService'));
    require(path.join(SRC_DIR, 'services/reportService'));
    console.log('✅ 服务模块加载正常');
    return true;
  } catch (error) {
    console.error('❌ 服务模块加载失败:', error.message);
    return false;
  }
};

const checkScheduler = () => {
  try {
    require(path.join(SRC_DIR, 'tasks/scheduler'));
    console.log('✅ 定时任务模块加载正常');
    return true;
  } catch (error) {
    console.error('❌ 定时任务模块加载失败:', error.message);
    return false;
  }
};

const run = async () => {
  console.log('========================================');
  console.log('  系统启动检查');
  console.log('========================================\n');

  const codeResults = [];
  codeResults.push(checkModules());
  codeResults.push(checkEnv());
  
  if (codeResults.every(r => r)) {
    codeResults.push(checkModels());
    codeResults.push(checkRoutes());
    codeResults.push(checkServices());
    codeResults.push(checkScheduler());
  }

  const dbResult = codeResults.every(r => r) ? await checkDB() : false;

  console.log('\n========================================');
  const codeOk = codeResults.every(r => r);
  if (codeOk && dbResult) {
    console.log('  ✅ 所有检查通过，系统可以启动');
    console.log('  运行 npm start 启动服务');
    process.exit(0);
  } else if (codeOk && !dbResult) {
    console.log('  ⚠️  代码检查通过，但数据库连接失败');
    console.log('  提示: 在 .env 中设置 USE_MEMORY_DB=true 可使用内存数据库');
    process.exit(1);
  } else {
    const passedCount = codeResults.filter(r => r).length;
    console.log(`  ❌ 代码检查 ${passedCount}/${codeResults.length} 项通过`);
    console.log('  请修复上述问题后重试');
    process.exit(1);
  }
};

run();
