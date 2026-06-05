require('dotenv').config();
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');

let mongoServer;
let adminToken;
let hrToken;
let testJobId;
let testCandidateId;
let testJobCandidateId;
let testInterviewId;
let testOfferId;

const testAdmin = {
  name: 'Test Admin',
  email: 'admin@test.com',
  password: 'password123',
  role: 'admin'
};

const testHR = {
  name: 'Test HR',
  email: 'hr@test.com',
  password: 'password123',
  role: 'hr'
};

const testCandidate = {
  name: '张三',
  email: 'zhangsan@test.com',
  phone: '13800138000',
  highestDegree: '硕士',
  yearsOfExperience: 5,
  skills: ['JavaScript', 'Node.js', 'React', 'MongoDB', 'Express'],
  currentPosition: '高级工程师',
  currentEmployer: 'ABC科技',
  expectedSalaryMin: 30000,
  expectedSalaryMax: 50000,
  location: '北京'
};

const testJob = {
  title: '高级前端工程师',
  department: '技术部',
  level: 'P7',
  employmentType: 'full_time',
  location: '北京',
  description: '负责公司核心产品的前端开发工作，参与技术架构设计和性能优化。',
  requirements: '3年以上前端开发经验，熟悉React、Node.js等技术栈。',
  requiredSkills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
  yearsOfExperience: { min: 3, max: 8 },
  educationLevel: '本科',
  salaryMin: 35000,
  salaryMax: 50000,
  budget: 800000
};

const setupTestDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
};

const teardownTestDB = async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};

const runTests = async () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 开始集成测试 - 智能人才招聘与筛选系统');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;
  const results = [];

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
      results.push({ name, status: 'pass' });
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   错误: ${error.message}`);
      failed++;
      results.push({ name, status: 'fail', error: error.message });
    }
  };

  const assert = (condition, message) => {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  };

  try {
    console.log('\n� 初始化内存数据库...');
    await setupTestDB();
    console.log('✅ 内存数据库连接成功');

    console.log('\n' + '-'.repeat(70));
    console.log('📝 测试1: 职位发布与智能匹配');
    console.log('-'.repeat(70));

    await test('注册管理员用户', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testAdmin);
      assert(res.status === 201, `期望状态码201，实际${res.status}`);
      adminToken = res.body.token;
    });

    await test('注册HR用户', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testHR);
      assert(res.status === 201, `期望状态码201，实际${res.status}`);
      hrToken = res.body.token;
    });

    await test('创建测试候选人', async () => {
      const res = await request(app)
        .post('/api/v1/candidates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testCandidate);
      assert(res.status === 201, `期望状态码201，实际${res.status}`);
      testCandidateId = res.body.data._id;
    });

    await test('创建职位', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testJob);
      assert(res.status === 201, `期望状态码201，实际${res.status}`);
      testJobId = res.body.data._id;
    });

    await test('验证职位预算校验', async () => {
      const res = await request(app)
        .post('/api/v1/jobs/validate-budget')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testJob);
      assert(res.status === 200, `期望状态码200，实际${res.status}`);
      assert(res.body.data.isValid === true, '期望预算校验通过');
    });

    await test('发布职位并触发智能匹配', async () => {
      const res = await request(app)
        .post(`/api/v1/jobs/${testJobId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert(res.status === 200, `期望状态码200，实际${res.status}`);
      assert(res.body.data.status === 'open', '期望职位状态为open');
    });

    await test('获取职位匹配结果', async () => {
      const res = await request(app)
        .get(`/api/v1/jobs/matches/${testJobId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert(res.status === 200, `期望状态码200，实际${res.status}`);
      assert(Array.isArray(res.body.data), '期望返回数组');
    });

    console.log('\n' + '-'.repeat(70));
    console.log('📝 测试2: 简历筛选评分排名');
    console.log('-'.repeat(70));

    await test('获取候选人排名列表', async () => {
      const res = await request(app)
        .get(`/api/v1/screening/ranking?jobId=${testJobId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert(res.status === 200, `期望状态码200，实际${res.status}`);
      assert(Array.isArray(res.body.data), '期望返回数组');
    });

    await test('获取筛选统计数据', async () => {
      const res = await request(app)
        .get('/api/v1/screening/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      assert(res.status === 200, `期望状态码200，实际${res.status}`);
      assert(res.body.data !== undefined, '期望返回统计数据');
    });

    console.log('\n' + '-'.repeat(70));
    console.log('📝 测试3: 面试安排冲突检测');
    console.log('-'.repeat(70));

    await test('检测面试时间冲突（无冲突）', async () => {
      const startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const res = await request(app)
        .post('/api/v1/interviews/check-conflict')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          candidateId: testCandidateId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        });
      assert(res.status === 200, `期望状态码200，实际${res.status}`);
      assert(res.body.hasConflict === false, '期望无冲突');
    });

    console.log('\n' + '-'.repeat(70));
    console.log('📝 测试4: 面试评价分歧检测');
    console.log('-'.repeat(70));

    await test('检测面试评分分歧（无显著分歧）', async () => {
      const evaluations = [
        {
          interviewerName: '面试官A',
          overallScore: 8,
          scores: { technicalSkills: 8, communication: 7, problemSolving: 8 }
        },
        {
          interviewerName: '面试官B',
          overallScore: 8.5,
          scores: { technicalSkills: 9, communication: 8, problemSolving: 8 }
        }
      ];

      const res = await request(app)
        .post('/api/v1/interviews/score-difference')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ evaluations });
      assert(res.status === 200, `期望状态码200，实际${res.status}`);
      assert(res.body.evaluationCount === 2, '期望2条评价');
    });

    await test('检测面试评分分歧（有显著分歧）', async () => {
      const evaluations = [
        {
          interviewerName: '面试官A',
          overallScore: 3,
          scores: { technicalSkills: 3, communication: 4, problemSolving: 2 }
        },
        {
          interviewerName: '面试官B',
          overallScore: 9,
          scores: { technicalSkills: 9, communication: 8, problemSolving: 10 }
        }
      ];

      const res = await request(app)
        .post('/api/v1/interviews/score-difference')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ evaluations });
      assert(res.status === 200, `期望状态码200，实际${res.status}`);
      assert(res.body.hasSignificantDisagreement === true, '期望检测到显著分歧');
    });

    console.log('\n' + '-'.repeat(70));
    console.log('📝 测试5: 薪酬包计算与预算审批');
    console.log('-'.repeat(70));

    await test('计算薪酬包', async () => {
      const res = await request(app)
        .post('/api/v1/offers/calculate-compensation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          level: 'P7',
          baseSalary: 40000,
          performanceRating: 1.0
        });
      assert(res.status === 200, `期望状态码200，实际${res.status}`);
      assert(res.body.data.package !== undefined, '期望返回薪酬包');
      assert(res.body.data.package.totalCompensation > 0, '期望总薪酬大于0');
    });

    console.log('\n' + '-'.repeat(70));
    console.log('📝 测试6: 背景调查功能');
    console.log('-'.repeat(70));

    await test('获取背景调查统计数据', async () => {
      const res = await request(app)
        .get('/api/v1/background-checks/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      assert(res.status === 200, `期望状态码200，实际${res.status}`);
      assert(res.body.data !== undefined, '期望返回统计数据');
    });

    console.log('\n' + '-'.repeat(70));
    console.log('📝 测试7: 招聘漏斗报表');
    console.log('-'.repeat(70));

    await test('生成招聘漏斗报表', async () => {
      const res = await request(app)
        .post('/api/v1/reports/funnel')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ saveReport: false });
      assert(res.status === 200, `期望状态码200，实际${res.status}`);
      assert(res.body.data.funnelMetrics !== undefined, '期望返回漏斗指标');
    });

    await test('获取部门统计数据', async () => {
      const res = await request(app)
        .get('/api/v1/reports/department-stats')
        .set('Authorization', `Bearer ${adminToken}`);
      assert(res.status === 200, `期望状态码200，实际${res.status}`);
    });

    await test('获取来源统计数据', async () => {
      const res = await request(app)
        .get('/api/v1/reports/source-stats')
        .set('Authorization', `Bearer ${adminToken}`);
      assert(res.status === 200, `期望状态码200，实际${res.status}`);
    });

    await test('获取报表列表', async () => {
      const res = await request(app)
        .get('/api/v1/reports')
        .set('Authorization', `Bearer ${adminToken}`);
      assert(res.status === 200, `期望状态码200，实际${res.status}`);
    });

    console.log('\n' + '-'.repeat(70));
    console.log('📝 测试8: API健康检查');
    console.log('-'.repeat(70));

    await test('健康检查端点', async () => {
      const res = await request(app).get('/api/v1/health');
      assert(res.status === 200, `期望状态码200，实际${res.status}`);
      assert(res.body.success === true, '期望success为true');
    });

  } catch (error) {
    console.error('\n❌ 测试执行错误:', error.message);
    console.error(error.stack);
    failed++;
  } finally {
    await teardownTestDB();
    console.log('\n🔌 数据库连接已关闭');
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(70));
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📈 通过率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(70));

  if (failed > 0) {
    console.log('\n❌ 部分测试失败，请检查错误信息');
    process.exit(1);
  } else {
    console.log('\n🎉 所有测试通过！');
    process.exit(0);
  }
};

runTests().catch(error => {
  console.error('❌ 测试运行失败:', error);
  process.exit(1);
});
