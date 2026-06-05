import 'reflect-metadata';
import { Entity, PrimaryColumn, Column } from 'typeorm';
import type { TransportStatus, Position3D, NurseConfirmation } from '../types';

@Entity()
export class TransportTask {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  requestId: string;

  @Column({ type: 'varchar', length: 100 })
  robotId: string;

  @Column({ type: 'simple-json' })
  path: Position3D[];

  @Column({ type: 'varchar', length: 50 })
  status: TransportStatus;

  @Column({ type: 'varchar', length: 100 })
  startTime: string;

  @Column({ type: 'varchar', length: 100 })
  estimatedArrival: string;

  @Column({ type: 'simple-json' })
  currentPosition: Position3D;

  @Column({ type: 'float' })
  progress: number;

  @Column({ type: 'simple-json', nullable: true })
  nurseConfirmation: NurseConfirmation;

  @Column({ type: 'simple-json', nullable: true })
  bloodBagIds: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  destinationWard: string;
}
