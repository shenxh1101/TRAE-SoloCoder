const Database = require('better-sqlite3');
const db = new Database('./database/fleet.db');

const id = 'a_test_escalation';
const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '');

try {
  db.prepare(`
    INSERT INTO applications 
    (id, user_id, user_name, user_department, vehicle_id, vehicle_plate, vehicle_model, 
     purpose, people_count, start_time, end_time, estimated_cost, approval_level, status, escalated, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)
  `).run(id, '5', '刘员工', '市场部', 'v5', '京E33333', '本田雅阁', 
         '测试24小时自动升级', 2, '2026-06-05 09:00:00', '2026-06-05 18:00:00', 150, 
         'department', oldTime);
  
  console.log(`Created application ${id} with created_at = ${oldTime}`);

  const before = db.prepare('SELECT id, status, escalated, approval_level, created_at FROM applications WHERE id = ?').get(id);
  console.log('Before:', JSON.stringify(before));

  const pendingApps = db.prepare(`
    SELECT id, created_at, approval_level
    FROM applications 
    WHERE status = 'pending' 
      AND escalated = 0
      AND created_at <= DATETIME('now', '-24 hours')
  `).all();
  console.log('Apps needing escalation:', pendingApps.length);

  for (const app of pendingApps) {
    db.prepare('UPDATE applications SET escalated = 1, approval_level = ? WHERE id = ?').run('admin', app.id);
    console.log(`Escalated: ${app.id}`);
  }

  const after = db.prepare('SELECT id, status, escalated, approval_level, created_at FROM applications WHERE id = ?').get(id);
  console.log('After:', JSON.stringify(after));

} catch (err) {
  console.error('Error:', err.message);
}

db.close();
