import bcrypt from 'bcryptjs';
import db from './index';
import { initDatabase } from './init';

async function seedDatabase(): Promise<void> {
  initDatabase();

  const hashedPassword = await bcrypt.hash('123456', 10);

  const users = [
    {
      username: 'admin',
      password: hashedPassword,
      name: '系统管理员',
      role: 'headquarters',
      region: null,
      branch: null
    },
    {
      username: 'region_manager',
      password: hashedPassword,
      name: '区域经理',
      role: 'region',
      region: '华东区',
      branch: null
    },
    {
      username: 'branch_user',
      password: hashedPassword,
      name: '支公司用户',
      role: 'branch',
      region: '华东区',
      branch: '上海分公司'
    }
  ];

  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (username, password, name, role, region, branch)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((userList) => {
    for (const user of userList) {
      insertUser.run(
        user.username,
        user.password,
        user.name,
        user.role,
        user.region,
        user.branch
      );
    }
  });

  insertMany(users);

  console.log('Seed data inserted successfully.');
  console.log('Test users created:');
  console.log('  - admin / 123456 (headquarters)');
  console.log('  - region_manager / 123456 (region)');
  console.log('  - branch_user / 123456 (branch)');
}

if (require.main === module) {
  seedDatabase().catch(console.error);
}

export default seedDatabase;
