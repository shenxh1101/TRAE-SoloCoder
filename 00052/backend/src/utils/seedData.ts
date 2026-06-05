import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { hashSync } from 'bcryptjs';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Patient } from '../entities/Patient';
import { BloodBag } from '../entities/BloodBag';
import { Robot } from '../entities/Robot';
import { ColdStorage } from '../entities/ColdStorage';
import { generateId, addDays, formatDateTime } from './dateUtils';
import { calculateInventoryStats } from './bloodTypeUtils';
import type { UserRole, BloodType, BloodComponent, BloodBagStatus, Position3D, StorageLocation, TestReport } from '../types';

const PASSWORD_HASH = hashSync('password123', 10);

const BLOOD_TYPES: BloodType[] = ['A', 'B', 'AB', 'O'];
const COMPONENTS: BloodComponent[] = ['whole_blood', 'plasma', 'platelet'];
const STATUSES: BloodBagStatus[] = ['available', 'available', 'available', 'available', 'available', 'allocated', 'used', 'expired'];

function createUsers(dataSource: DataSource): User[] {
  const users: User[] = [];

  const userData: { username: string; name: string; role: UserRole; department: string }[] = [
    { username: 'doctor', name: '张医生', role: 'doctor', department: '内科' },
    { username: 'director', name: '李主任', role: 'department_director', department: '内科' },
    { username: 'blood_bank_director', name: '王主任', role: 'blood_bank_director', department: '输血科' },
    { username: 'nurse', name: '刘护士', role: 'nurse', department: '内科' },
    { username: 'admin', name: '管理员', role: 'admin', department: '信息科' },
  ];

  userData.forEach(data => {
    const user = new User();
    user.id = generateId('user');
    user.username = data.username;
    user.name = data.name;
    user.role = data.role;
    user.department = data.department;
    user.passwordHash = PASSWORD_HASH;
    user.createdAt = formatDateTime(new Date());
    users.push(user);
  });

  return users;
}

function createPatients(): Patient[] {
  const patients: Patient[] = [];

  const names = ['王伟', '李娜', '张强', '刘芳', '陈明', '杨洋', '赵磊', '黄丽', '周杰', '吴敏', '孙涛', '郑华', '钱伟', '孙丽', '周明'];
  const departments = ['内科', '外科', '骨科', '妇产科', '儿科', '急诊科', 'ICU'];

  for (let i = 0; i < 15; i++) {
    const patient = new Patient();
    patient.id = generateId('patient');
    patient.name = names[i];
    patient.gender = i % 2 === 0 ? 'male' : 'female';
    patient.age = 20 + (i * 3) % 60;
    patient.bloodType = BLOOD_TYPES[i % 4];
    patient.medicalRecordNumber = `MR${String(i + 1).padStart(6, '0')}`;
    patient.department = departments[i % departments.length];
    patient.bedNumber = `${String.fromCharCode(65 + (i % 5))}${Math.floor(i / 5) + 1}${(i % 5) + 1}`;
    patient.diagnosis = getDiagnosis(i);
    patients.push(patient);
  }

  return patients;
}

function getDiagnosis(index: number): string {
  const diagnoses = [
    '上消化道出血',
    '缺铁性贫血',
    '急性阑尾炎',
    '多发性骨折',
    '产后出血',
    '早产儿贫血',
    '重型地中海贫血',
    '肝硬化伴出血',
    '恶性淋巴瘤',
    '急性白血病',
    '消化道大出血',
    '严重创伤',
    '血友病',
    '慢性肾病贫血',
    '骨髓增生异常综合征'
  ];
  return diagnoses[index % diagnoses.length];
}

function generateTestReports(bloodBagId: string): TestReport[] {
  const report: TestReport = {
    id: generateId('test'),
    bloodBagId,
    testDate: formatDateTime(new Date()),
    hemoglobin: 130 + Math.random() * 20,
    hematocrit: 0.4 + Math.random() * 0.1,
    plateletCount: 200 + Math.random() * 100,
    whiteBloodCellCount: 5 + Math.random() * 3,
    ph: 7.35 + Math.random() * 0.1,
    isNormal: true
  };
  return [report];
}

function generatePosition3D(index: number): Position3D {
  const shelf = Math.floor(index / 20) % 3;
  const row = Math.floor((index % 20) / 5);
  const col = index % 5;
  
  return {
    x: -8 + col * 0.5,
    y: 1.5 + shelf * 0.8,
    z: -3 + row * 0.6
  };
}

function generateStorageLocation(index: number): StorageLocation {
  return {
    shelf: Math.floor(index / 20) + 1,
    row: Math.floor(((index % 20) % 4) + 1),
    column: (index % 5) + 1
  };
}

function createBloodBags(): BloodBag[] {
  const bloodBags: BloodBag[] = [];

  for (let i = 0; i < 120; i++) {
    const bloodType = BLOOD_TYPES[Math.floor(i / 30)];
    const component = COMPONENTS[Math.floor((i % 30) / 10)];
    const collectionDate = addDays(new Date(), -Math.floor(Math.random() * 20) - 5);
    const expiryDays = component === 'platelet' ? 5 : component === 'plasma' ? 35 : 35;
    const expiryDate = addDays(collectionDate, expiryDays);
    const statusIndex = i < 100 ? 0 : Math.floor(Math.random() * STATUSES.length);
    
    const bloodBag = new BloodBag();
    bloodBag.id = generateId('bb');
    bloodBag.bloodType = bloodType;
    bloodBag.component = component;
    bloodBag.collectionDate = collectionDate;
    bloodBag.expiryDate = expiryDate;
    bloodBag.storageLocation = generateStorageLocation(i);
    bloodBag.volume = component === 'whole_blood' ? 200 : component === 'plasma' ? 100 : 50;
    bloodBag.donorId = generateId('donor');
    bloodBag.position3D = generatePosition3D(i);
    bloodBag.status = STATUSES[statusIndex];
    bloodBag.testReports = generateTestReports(bloodBag.id);
    bloodBag.createdAt = formatDateTime(new Date());
    bloodBag.updatedAt = formatDateTime(new Date());
    
    bloodBags.push(bloodBag);
  }

  return bloodBags;
}

function createRobots(): Robot[] {
  const robots: Robot[] = [];

  for (let i = 0; i < 3; i++) {
    const robot = new Robot();
    robot.id = generateId('robot');
    robot.name = `运输机器人-${i + 1}`;
    robot.status = i === 0 ? 'busy' : 'idle';
    robot.battery = 70 + Math.random() * 30;
    robot.currentPosition = {
      x: 0,
      y: 0.5,
      z: 0
    };
    if (i === 0) {
      robot.currentTaskId = generateId('task');
    }
    robots.push(robot);
  }

  return robots;
}

function createColdStorage(): ColdStorage {
  const coldStorage = new ColdStorage();
  coldStorage.id = generateId('cold');
  coldStorage.name = '一号冷库';
  coldStorage.currentTemperature = 4.0;
  coldStorage.targetTemperature = 4.0;
  coldStorage.minTemperature = 2.0;
  coldStorage.maxTemperature = 6.0;
  coldStorage.isBackupCoolingActive = false;
  coldStorage.lastUpdate = formatDateTime(new Date());
  coldStorage.status = 'normal';
  return coldStorage;
}

export async function createSeedData(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log('DataSource initialized successfully');

    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.query('DELETE FROM blood_collection_plan');
    await queryRunner.query('DELETE FROM system_alert');
    await queryRunner.query('DELETE FROM inventory_alert');
    await queryRunner.query('DELETE FROM transport_task');
    await queryRunner.query('DELETE FROM transfusion_request');
    await queryRunner.query('DELETE FROM cold_storage');
    await queryRunner.query('DELETE FROM robot');
    await queryRunner.query('DELETE FROM blood_bag');
    await queryRunner.query('DELETE FROM patient');
    await queryRunner.query('DELETE FROM user');

    console.log('All tables cleared');

    const userRepository = AppDataSource.getRepository(User);
    const patientRepository = AppDataSource.getRepository(Patient);
    const bloodBagRepository = AppDataSource.getRepository(BloodBag);
    const robotRepository = AppDataSource.getRepository(Robot);
    const coldStorageRepository = AppDataSource.getRepository(ColdStorage);

    const users = createUsers(AppDataSource);
    await userRepository.save(users);
    console.log(`Created ${users.length} users`);

    const patients = createPatients();
    await patientRepository.save(patients);
    console.log(`Created ${patients.length} patients`);

    const bloodBags = createBloodBags();
    await bloodBagRepository.save(bloodBags);
    console.log(`Created ${bloodBags.length} blood bags`);

    const robots = createRobots();
    await robotRepository.save(robots);
    console.log(`Created ${robots.length} robots`);

    const coldStorage = createColdStorage();
    await coldStorageRepository.save(coldStorage);
    console.log('Created cold storage');

    const stats = calculateInventoryStats(bloodBags);
    console.log('\nInventory Statistics:');
    BLOOD_TYPES.forEach(bt => {
      COMPONENTS.forEach(comp => {
        console.log(`${bt} ${comp}: total=${stats[bt][comp].total}, available=${stats[bt][comp].available}`);
      });
    });

    await AppDataSource.destroy();
    console.log('\nSeed data created successfully!');
  } catch (error) {
    console.error('Error creating seed data:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

if (require.main === module) {
  createSeedData();
}
