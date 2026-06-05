import 'reflect-metadata';
import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class ColdStorage {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'float' })
  currentTemperature: number;

  @Column({ type: 'float' })
  targetTemperature: number;

  @Column({ type: 'float' })
  minTemperature: number;

  @Column({ type: 'float' })
  maxTemperature: number;

  @Column({ type: 'boolean' })
  isBackupCoolingActive: boolean;

  @Column({ type: 'varchar', length: 100 })
  lastUpdate: string;

  @Column({ type: 'varchar', length: 50 })
  status: 'normal' | 'warning' | 'critical';
}
