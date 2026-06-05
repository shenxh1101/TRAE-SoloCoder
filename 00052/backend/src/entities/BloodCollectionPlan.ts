import 'reflect-metadata';
import { Entity, PrimaryColumn, Column } from 'typeorm';
import type { BloodType, BloodComponent } from '../types';

@Entity()
export class BloodCollectionPlan {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  bloodType: BloodType;

  @Column({ type: 'varchar', length: 50 })
  component: BloodComponent;

  @Column({ type: 'int' })
  targetVolume: number;

  @Column({ type: 'varchar', length: 100 })
  deadline: string;

  @Column({ type: 'varchar', length: 50 })
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';

  @Column({ type: 'varchar', length: 100 })
  notifiedAt: string;

  @Column({ type: 'varchar', length: 200 })
  bloodStationName: string;
}
