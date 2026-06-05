require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ParkingSpace = require('../models/ParkingSpace');

const initData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Database connected');

    console.log('\n=== Creating Admin User ===');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.findOneAndUpdate(
      { phone: '13800138000' },
      {
        phone: '13800138000',
        password: adminPassword,
        name: '系统管理员',
        role: 'admin',
        licensePlates: [],
        isBookingRestricted: false,
        violationCount: 0
      },
      { upsert: true, new: true }
    );
    console.log('Admin user created/updated: 13800138000 / admin123');

    console.log('\n=== Creating Test User ===');
    const userPassword = await bcrypt.hash('user123', 10);
    const testUser = await User.findOneAndUpdate(
      { phone: '13900139000' },
      {
        phone: '13900139000',
        password: userPassword,
        name: '测试用户',
        role: 'user',
        licensePlates: ['京A12345', '京B67890'],
        defaultPlate: '京A12345',
        isBookingRestricted: false,
        violationCount: 0
      },
      { upsert: true, new: true }
    );
    console.log('Test user created/updated: 13900139000 / user123');

    console.log('\n=== Creating Parking Spaces ===');
    
    const zones = ['A', 'B', 'C', 'D', 'E'];
    const types = ['compact', 'standard', 'large', 'disabled'];
    const spacesPerZone = 20;

    for (const zone of zones) {
      for (let i = 1; i <= spacesPerZone; i++) {
        const spaceNumber = `${zone}${String(i).padStart(3, '0')}`;
        const typeIndex = i % 4;
        const type = i <= 2 && zone === 'A' ? 'disabled' : types[typeIndex];
        
        await ParkingSpace.findOneAndUpdate(
          { spaceNumber },
          {
            spaceNumber,
            zone,
            type,
            status: 'available',
            floor: 1,
            sensorId: `SENSOR-${spaceNumber}`
          },
          { upsert: true }
        );
      }
      console.log(`Created ${spacesPerZone} spaces in Zone ${zone}`);
    }

    const totalSpaces = await ParkingSpace.countDocuments();
    console.log(`\nTotal parking spaces: ${totalSpaces}`);

    console.log('\n=== Initialization Complete ===');
    console.log('\nLogin Credentials:');
    console.log('  Admin: 13800138000 / admin123');
    console.log('  User:  13900139000 / user123');
    console.log('\nParking Spaces:');
    console.log('  Zone A (VIP): 20 spaces');
    console.log('  Zone B: 20 spaces');
    console.log('  Zone C: 20 spaces');
    console.log('  Zone D: 20 spaces');
    console.log('  Zone E: 20 spaces');
    console.log('  Total: 100 spaces');

    process.exit(0);
  } catch (error) {
    console.error('Error initializing data:', error);
    process.exit(1);
  }
};

initData();
