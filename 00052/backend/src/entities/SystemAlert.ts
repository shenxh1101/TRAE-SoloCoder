import 'reflect-metadata';
import { Entity, PrimaryColumn, Column } from 'typeorm';
import type { AlertType, AlertSeverity } from '../types';

@Entity()
export class SystemAlert {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  type: AlertType;

  @Column({ type: 'varchar', length: 50 })
  severity: AlertSeverity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'boolean' })
  acknowledged: boolean;

  @Column({ type: 'varchar', length: 100 })
  createdAt: string;

  @Column({ type: 'simple-json', nullable: true })
  details: Record<string, any>;
}
