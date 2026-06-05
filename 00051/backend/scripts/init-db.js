const { db, runQuery, getOne } = require('../config/database');
const bcrypt = require('bcryptjs');

const initDatabase = () => {
  try {
    db.exec(`DROP TABLE IF EXISTS maintenance_records`);
    db.exec(`DROP TABLE IF EXISTS return_records`);
    db.exec(`DROP TABLE IF EXISTS applications`);
    db.exec(`DROP TABLE IF EXISTS vehicles`);
    db.exec(`DROP TABLE IF EXISTS violation_records`);
    db.exec(`DROP TABLE IF EXISTS users`);

    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('employee', 'manager', 'admin')),
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE vehicles (
        id TEXT PRIMARY KEY,
        plate_number TEXT UNIQUE NOT NULL,
        model TEXT NOT NULL,
        seats INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('idle', 'in_use', 'maintenance', 'disabled')) DEFAULT 'idle',
        current_mileage INTEGER DEFAULT 0,
        fuel_level INTEGER DEFAULT 100,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE applications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_department TEXT NOT NULL,
        vehicle_id TEXT NOT NULL,
        vehicle_plate TEXT NOT NULL,
        vehicle_model TEXT NOT NULL,
        purpose TEXT NOT NULL,
        people_count INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
        approver_id TEXT,
        approval_level TEXT CHECK(approval_level IN ('department', 'admin')) DEFAULT 'department',
        approval_comment TEXT,
        escalated INTEGER DEFAULT 0,
        estimated_cost REAL,
        actual_cost REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_at DATETIME
      )
    `);

    db.exec(`
      CREATE TABLE return_records (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        actual_mileage INTEGER NOT NULL,
        fuel_level INTEGER NOT NULL,
        inspection_photos TEXT,
        has_damage INTEGER DEFAULT 0,
        damage_description TEXT,
        returned_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE maintenance_records (
        id TEXT PRIMARY KEY,
        vehicle_id TEXT NOT NULL,
        application_id TEXT,
        description TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
        estimated_cost REAL,
        actual_cost REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `);

    db.exec(`
      CREATE TABLE violation_records (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        vehicle_plate TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const password = bcrypt.hashSync('admin123', 10);
    const users = [
      { id: '1', username: 'admin', password: password, name: '张管理', department: '行政部', role: 'admin' },
      { id: '2', username: 'manager', password: password, name: '李经理', department: '技术部', role: 'manager' },
      { id: '3', username: 'employee', password: password, name: '王员工', department: '技术部', role: 'employee' },
      { id: '4', username: 'manager2', password: password, name: '赵经理', department: '市场部', role: 'manager' },
      { id: '5', username: 'employee2', password: password, name: '刘员工', department: '市场部', role: 'employee' },
      { id: '6', username: 'employee3', password: password, name: '陈员工', department: '财务部', role: 'employee' },
    ];

    const insertUser = db.prepare(`INSERT INTO users (id, username, password, name, department, role) VALUES (?, ?, ?, ?, ?, ?)`);
    const insertManyUsers = db.transaction((userList) => {
      for (const user of userList) {
        insertUser.run(user.id, user.username, user.password, user.name, user.department, user.role);
      }
    });
    insertManyUsers(users);

    const vehicles = [
      { id: 'v1', plate_number: '京A12345', model: '大众帕萨特', seats: 5, status: 'idle', current_mileage: 35680, fuel_level: 85 },
      { id: 'v2', plate_number: '京B67890', model: '别克GL8', seats: 7, status: 'in_use', current_mileage: 42150, fuel_level: 60 },
      { id: 'v3', plate_number: '京C11111', model: '丰田凯美瑞', seats: 5, status: 'maintenance', current_mileage: 28900, fuel_level: 40 },
      { id: 'v4', plate_number: '京D22222', model: '奔驰V260', seats: 9, status: 'idle', current_mileage: 15600, fuel_level: 95 },
      { id: 'v5', plate_number: '京E33333', model: '本田雅阁', seats: 5, status: 'idle', current_mileage: 52300, fuel_level: 70 },
      { id: 'v6', plate_number: '京F44444', model: '奥迪A6L', seats: 5, status: 'disabled', current_mileage: 89000, fuel_level: 20 },
      { id: 'v7', plate_number: '京G55555', model: '丰田考斯特', seats: 19, status: 'in_use', current_mileage: 67800, fuel_level: 55 },
      { id: 'v8', plate_number: '京H66666', model: '特斯拉Model Y', seats: 5, status: 'idle', current_mileage: 12500, fuel_level: 100 },
    ];

    const insertVehicle = db.prepare(`INSERT INTO vehicles (id, plate_number, model, seats, status, current_mileage, fuel_level) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const insertManyVehicles = db.transaction((vehicleList) => {
      for (const v of vehicleList) {
        insertVehicle.run(v.id, v.plate_number, v.model, v.seats, v.status, v.current_mileage, v.fuel_level);
      }
    });
    insertManyVehicles(vehicles);

    db.exec(`
      INSERT INTO violation_records (id, application_id, user_name, vehicle_plate, type, description) VALUES
      ('vi1', 'a5', '刘员工', '京D22222', '超速', '在五环路上超速行驶，时速120km/h'),
      ('vi2', 'a6', '陈员工', '京A12345', '违停', '在禁止停车区域停放车辆')
    `);

    console.log('✅ 数据库初始化成功！');
    console.log('👤 测试账号:');
    console.log('   - 车管员: admin / admin123');
    console.log('   - 部门主管: manager / manager123');
    console.log('   - 普通员工: employee / employee123');
  } catch (err) {
    console.error('数据库初始化失败:', err);
    throw err;
  }
};

try {
  initDatabase();
  db.close();
  process.exit(0);
} catch (err) {
  console.error('数据库初始化失败:', err);
  db.close();
  process.exit(1);
}
