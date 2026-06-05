import bcrypt from 'bcryptjs';
import db from '../config/db.js';
import { generateId, toJSON } from '../utils/helpers.js';

const seedData = async () => {
  try {
    console.log('开始初始化数据...');

    db.prepare('DELETE FROM schedules').run();
    db.prepare('DELETE FROM reminders').run();
    db.prepare('DELETE FROM reviews').run();
    db.prepare('DELETE FROM messages').run();
    db.prepare('DELETE FROM booking_updates').run();
    db.prepare('DELETE FROM bookings').run();
    db.prepare('DELETE FROM vaccines').run();
    db.prepare('DELETE FROM pets').run();
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM packages').run();
    db.prepare('DELETE FROM rooms').run();
    db.prepare('DELETE FROM caregivers').run();

    console.log('已清空现有数据');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);

    const adminId = generateId();
    db.prepare(`
      INSERT INTO users (id, name, email, password, phone, role, avatar)
      VALUES (?, ?, ?, ?, ?, 'admin', ?)
    `).run(adminId, '管理员', 'admin@example.com', hashedPassword, '13800000001', `https://api.dicebear.com/7.x/avataaars/svg?seed=${adminId}`);
    console.log('创建管理员用户: admin@example.com / 123456');

    const caregiver1Id = generateId();
    db.prepare(`
      INSERT INTO users (id, name, email, password, phone, role, avatar)
      VALUES (?, ?, ?, ?, ?, 'caregiver', ?)
    `).run(caregiver1Id, '李护理员', 'caregiver@example.com', hashedPassword, '13800000002', `https://api.dicebear.com/7.x/avataaars/svg?seed=${caregiver1Id}`);
    console.log('创建护理员用户: caregiver@example.com / 123456');

    const userId = generateId();
    db.prepare(`
      INSERT INTO users (id, name, email, password, phone, role, avatar)
      VALUES (?, ?, ?, ?, ?, 'user', ?)
    `).run(userId, '张三', 'user@example.com', hashedPassword, '13800000003', `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`);
    console.log('创建普通用户: user@example.com / 123456');

    const cg1Id = generateId();
    db.prepare(`
      INSERT INTO caregivers (id, name, avatar, specialties, experienceYears, rating, recommendationWeight)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      cg1Id,
      '李护理员',
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${cg1Id}`,
      toJSON(['老年护理', '过敏护理', '术后护理']),
      5,
      4.8,
      1.0
    );

    const cg2Id = generateId();
    db.prepare(`
      INSERT INTO caregivers (id, name, avatar, specialties, experienceYears, rating, recommendationWeight)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      cg2Id,
      '王护理员',
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${cg2Id}`,
      toJSON(['幼犬护理', '行为训练', '紧急救治']),
      3,
      4.5,
      0.9
    );

    const cg3Id = generateId();
    db.prepare(`
      INSERT INTO caregivers (id, name, avatar, specialties, experienceYears, rating, recommendationWeight)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      cg3Id,
      '张护理员',
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${cg3Id}`,
      toJSON(['猫咪护理', '美容护理', '康复理疗']),
      7,
      4.9,
      1.1
    );
    console.log('创建3名护理员');

    const roomIds = [];
    for (let i = 1; i <= 6; i++) {
      const roomId = generateId();
      roomIds.push(roomId);
      const type = i <= 3 ? 'standard' : 'luxury';
      db.prepare(`
        INSERT INTO rooms (id, name, type, status, capacity, features)
        VALUES (?, ?, ?, 'available', 1, ?)
      `).run(
        roomId,
        `${type === 'standard' ? '标准' : '豪华'}房 ${i}`,
        type,
        toJSON([`空调`, `24小时监控`, `定时喂食`, type === 'luxury' ? '独立花园' : '共享活动区'])
      );
    }
    console.log('创建6个房间');

    const pkg1Id = generateId();
    db.prepare(`
      INSERT INTO packages (id, name, description, pricePerDay, features, roomIds, minAge, maxAge, minWeight, maxWeight, requiresAllergyFriendly)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pkg1Id,
      '经济型',
      '基础寄养服务，适合健康活泼的宠物',
      100,
      toJSON(['每日3次喂食', '每日1次遛弯', '基础健康检查', '24小时监控']),
      toJSON(roomIds.slice(0, 3)),
      null,
      null,
      null,
      null,
      0
    );

    const pkg2Id = generateId();
    db.prepare(`
      INSERT INTO packages (id, name, description, pricePerDay, features, roomIds, minAge, maxAge, minWeight, maxWeight, requiresAllergyFriendly)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pkg2Id,
      '豪华型',
      '高端寄养服务，适合有特殊需求的宠物',
      200,
      toJSON(['定制食谱', '每日2次遛弯', '专业美容护理', '独立花园活动', '专人陪护', '健康报告']),
      toJSON(roomIds.slice(3, 6)),
      null,
      null,
      null,
      null,
      1
    );
    console.log('创建2个套餐');

    const pet1Id = generateId();
    db.prepare(`
      INSERT INTO pets (id, userId, name, breed, age, weight, gender, avatar, allergies)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pet1Id,
      userId,
      '旺财',
      '金毛犬',
      3,
      25.5,
      'male',
      'https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&h=200&fit=crop',
      toJSON([])
    );

    const pet2Id = generateId();
    db.prepare(`
      INSERT INTO pets (id, userId, name, breed, age, weight, gender, avatar, allergies)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pet2Id,
      userId,
      '咪咪',
      '英国短毛猫',
      9,
      4.5,
      'female',
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=200&fit=crop',
      toJSON(['鸡肉过敏'])
    );
    console.log('创建2只宠物');

    console.log('数据初始化完成!');
    process.exit(0);
  } catch (error) {
    console.error('数据初始化失败:', error);
    process.exit(1);
  }
};

seedData();
