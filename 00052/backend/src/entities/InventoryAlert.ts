import 'reflect-metadata';
import { Entity, PrimaryColumn, Column } from 'typeorm';
import type { BloodType, BloodComponent, AlertSeverity } from '../types';

@Entity()
export class InventoryAlert {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  bloodType: BloodType;

  @Column({ type: 'varchar', length: 50 })
  component: BloodComponent;

  @Column({ type: 'int' })
  currentStock: number;

  @Column({ type: 'int' })
  threshold: number;

  @Column({ type: 'float' })
  daysOfSupply: number;

  @Column({ type: 'varchar', length: 50 })
  severity: AlertSeverity;

  @Column({ type: 'boolean' })
  acknowledged: boolean;

  @Column({ type: 'varchar', length: 100 })
  createdAt: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  collectionPlanId: string;
}
