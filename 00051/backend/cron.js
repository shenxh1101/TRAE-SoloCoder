const cron = require('node-cron');
const { db } = require('./config/database');

const checkAndEscalatePendingApplications = () => {
  console.log('🔍 检查待审批申请，自动升级超过24小时的申请...');
  
  try {
    const pendingApps = db.prepare(`
      SELECT id, created_at, approval_level, user_department
      FROM applications 
      WHERE status = 'pending' 
        AND escalated = 0
        AND created_at <= DATETIME('now', '-24 hours')
    `).all();

    const updateStmt = db.prepare(
      'UPDATE applications SET escalated = 1, approval_level = ? WHERE id = ?'
    );

    for (const app of pendingApps) {
      console.log(`⬆️  自动升级申请: ${app.id} (创建时间: ${app.created_at})`);
      updateStmt.run('admin', app.id);
    }

    if (pendingApps.length > 0) {
      console.log(`✅ 已自动升级 ${pendingApps.length} 个申请到车管员审批`);
    } else {
      console.log('✅ 没有需要自动升级的申请');
    }
  } catch (error) {
    console.error('❌ 自动升级审批失败:', error);
  }
};

const checkApplicationStatus = () => {
  console.log('🔍 检查申请状态更新...');
  
  try {
    db.exec(`
      UPDATE applications 
      SET status = 'in_progress'
      WHERE status = 'approved' 
        AND start_time <= DATETIME('now')
    `);

    db.exec(`
      UPDATE applications 
      SET status = 'completed'
      WHERE status = 'in_progress' 
        AND end_time <= DATETIME('now')
    `);
  } catch (error) {
    console.error('❌ 更新申请状态失败:', error);
  }
};

const startCronJobs = () => {
  console.log('⏰ 定时任务已启动');
  
  cron.schedule('0 * * * *', () => {
    console.log('\n' + '='.repeat(50));
    console.log('🕐 执行每小时定时任务 - ' + new Date().toLocaleString('zh-CN'));
    checkAndEscalatePendingApplications();
    checkApplicationStatus();
    console.log('='.repeat(50));
  });

  cron.schedule('*/10 * * * * *', () => {
  });

  setTimeout(() => {
    checkAndEscalatePendingApplications();
    checkApplicationStatus();
  }, 5000);
};

module.exports = {
  startCronJobs,
  checkAndEscalatePendingApplications,
  checkApplicationStatus
};
