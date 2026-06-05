import 'reflect-metadata';
import { Entity, PrimaryColumn, Column } from 'typeorm';
import type { Position3D } from '../types';

@Entity()
export class Robot {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  status: 'idle' | 'busy' | 'charging' | 'error';

  @Column({ type: 'float' })
  battery: number;

  @Column({ type: 'simple-json' })
  currentPosition: Position3D;

  @Column({ type: 'varchar', length: 100, nullable: true })
  currentTaskId: string;
}
