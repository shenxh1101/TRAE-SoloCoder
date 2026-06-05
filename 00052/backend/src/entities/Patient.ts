import 'reflect-metadata';
import { Entity, PrimaryColumn, Column } from 'typeorm';
import type { BloodType } from '../types';

@Entity()
export class Patient {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  gender: 'male' | 'female';

  @Column({ type: 'int' })
  age: number;

  @Column({ type: 'varchar', length: 50 })
  bloodType: BloodType;

  @Column({ type: 'varchar', length: 50, unique: true })
  medicalRecordNumber: string;

  @Column({ type: 'varchar', length: 100 })
  department: string;

  @Column({ type: 'varchar', length: 50 })
  bedNumber: string;

  @Column({ type: 'text' })
  diagnosis: string;
}
