import 'reflect-metadata';
import { Entity, PrimaryColumn, Column } from 'typeorm';
import type { BloodType, BloodComponent, BloodBagStatus, StorageLocation, TestReport, Position3D } from '../types';

@Entity()
export class BloodBag {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  bloodType: BloodType;

  @Column({ type: 'varchar', length: 50 })
  component: BloodComponent;

  @Column({ type: 'varchar', length: 100 })
  collectionDate: string;

  @Column({ type: 'varchar', length: 100 })
  expiryDate: string;

  @Column({ type: 'simple-json' })
  storageLocation: StorageLocation;

  @Column({ type: 'int' })
  volume: number;

  @Column({ type: 'varchar', length: 100 })
  donorId: string;

  @Column({ type: 'simple-json' })
  position3D: Position3D;

  @Column({ type: 'varchar', length: 50 })
  status: BloodBagStatus;

  @Column({ type: 'simple-json' })
  testReports: TestReport[];

  @Column({ type: 'varchar', length: 100 })
  createdAt: string;

  @Column({ type: 'varchar', length: 100 })
  updatedAt: string;
}
