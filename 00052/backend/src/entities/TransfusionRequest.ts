import 'reflect-metadata';
import { Entity, PrimaryColumn, Column } from 'typeorm';
import type { BloodType, BloodComponent, RequestStatus, ApprovalRecord, CrossMatchResult, TransportTask } from '../types';

@Entity()
export class TransfusionRequest {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  patientId: string;

  @Column({ type: 'varchar', length: 50 })
  bloodType: BloodType;

  @Column({ type: 'varchar', length: 50 })
  component: BloodComponent;

  @Column({ type: 'int' })
  volume: number;

  @Column({ type: 'varchar', length: 50 })
  urgency: 'routine' | 'urgent' | 'emergency';

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 100 })
  requesterId: string;

  @Column({ type: 'varchar', length: 100 })
  requesterName: string;

  @Column({ type: 'varchar', length: 100 })
  department: string;

  @Column({ type: 'varchar', length: 100 })
  ward: string;

  @Column({ type: 'varchar', length: 50 })
  bedNumber: string;

  @Column({ type: 'varchar', length: 50 })
  status: RequestStatus;

  @Column({ type: 'simple-json' })
  approvalRecords: ApprovalRecord[];

  @Column({ type: 'simple-json', nullable: true })
  crossMatchResult: CrossMatchResult;

  @Column({ type: 'simple-json', nullable: true })
  transportTask: TransportTask;

  @Column({ type: 'varchar', length: 100 })
  createdAt: string;

  @Column({ type: 'varchar', length: 100 })
  updatedAt: string;
}
