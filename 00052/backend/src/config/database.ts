import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../entities/User';
import { Patient } from '../entities/Patient';
import { BloodBag } from '../entities/BloodBag';
import { TransfusionRequest } from '../entities/TransfusionRequest';
import { TransportTask } from '../entities/TransportTask';
import { Robot } from '../entities/Robot';
import { ColdStorage } from '../entities/ColdStorage';
import { InventoryAlert } from '../entities/InventoryAlert';
import { SystemAlert } from '../entities/SystemAlert';
import { BloodCollectionPlan } from '../entities/BloodCollectionPlan';

export const dbConfig: DataSourceOptions = {
  type: 'better-sqlite3',
  database: 'blood_bank.sqlite',
  entities: [
    User,
    Patient,
    BloodBag,
    TransfusionRequest,
    TransportTask,
    Robot,
    ColdStorage,
    InventoryAlert,
    SystemAlert,
    BloodCollectionPlan,
  ],
  synchronize: true,
  logging: false,
};

export const AppDataSource = new DataSource(dbConfig);

export default dbConfig;
