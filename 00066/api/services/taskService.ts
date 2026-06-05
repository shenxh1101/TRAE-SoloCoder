import { v4 as uuidv4 } from 'uuid';
import type {
  Task,
  TaskStatus,
  UserRole,
  SourceParameters,
  CalculationResult,
} from '../../src/types/index';

type TaskStatusTransition = {
  from: TaskStatus;
  to: TaskStatus;
  operatorRole: UserRole;
  timestamp: string;
  errorMessage?: string;
};

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['geometry_check'],
  geometry_check: ['bem_calculation', 'abnormal'],
  bem_calculation: ['visualization', 'abnormal'],
  visualization: ['completed', 'abnormal'],
  completed: [],
  abnormal: ['pending'],
};

const STATUS_TIMEOUT_MS = 24 * 60 * 60 * 1000;

class TaskStateMachineError extends Error {
  constructor(
    message: string,
    public readonly taskId: string,
    public readonly currentStatus: TaskStatus,
    public readonly targetStatus: TaskStatus,
  ) {
    super(message);
    this.name = 'TaskStateMachineError';
  }
}

class TaskNotFoundError extends Error {
  constructor(public readonly taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
  }
}

interface TaskStoreItem extends Task {
  statusHistory: TaskStatusTransition[];
  lastStatusChangeAt: number;
}

class TaskService {
  private tasks: Map<string, TaskStoreItem> = new Map();
  private results: Map<string, CalculationResult> = new Map();
  private timeoutCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startTimeoutChecker();
  }

  createTask(params: {
    roomId: string;
    roomName: string;
    creatorId: string;
    creatorName: string;
    sourceParameters: SourceParameters;
  }): Task {
    const now = new Date().toISOString();
    const task: TaskStoreItem = {
      id: uuidv4(),
      roomId: params.roomId,
      roomName: params.roomName,
      creatorId: params.creatorId,
      creatorName: params.creatorName,
      status: 'pending',
      currentStage: 'created',
      progressPercent: 0,
      sourceParameters: params.sourceParameters,
      createdAt: now,
      updatedAt: now,
      statusHistory: [
        {
          from: 'pending',
          to: 'pending',
          operatorRole: 'engineer',
          timestamp: now,
        },
      ],
      lastStatusChangeAt: Date.now(),
    };

    this.tasks.set(task.id, task);
    return this.sanitizeTask(task);
  }

  getTask(taskId: string): Task | null {
    const task = this.tasks.get(taskId);
    return task ? this.sanitizeTask(task) : null;
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values()).map((t) => this.sanitizeTask(t));
  }

  async transitionStatus(
    taskId: string,
    targetStatus: TaskStatus,
    operatorRole: UserRole,
    errorMessage?: string,
  ): Promise<Task> {
    const task = this.tasks.get(taskId);

    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    const currentStatus = task.status;
    const validTargets = VALID_TRANSITIONS[currentStatus];

    if (!validTargets.includes(targetStatus)) {
      throw new TaskStateMachineError(
        `Invalid status transition from '${currentStatus}' to '${targetStatus}'. ` +
          `Valid transitions are: ${validTargets.join(', ')}`,
        taskId,
        currentStatus,
        targetStatus,
      );
    }

    if (targetStatus === 'abnormal' && currentStatus !== 'abnormal') {
      throw new TaskStateMachineError(
        `Only chief role can recover task from abnormal status`,
        taskId,
        currentStatus,
        targetStatus,
      );
    }

    const now = new Date().toISOString();
    const transition: TaskStatusTransition = {
      from: currentStatus,
      to: targetStatus,
      operatorRole,
      timestamp: now,
      errorMessage: targetStatus === 'abnormal' ? errorMessage : undefined,
    };

    task.status = targetStatus;
    task.statusHistory.push(transition);
    task.updatedAt = now;
    task.lastStatusChangeAt = Date.now();

    if (targetStatus === 'abnormal' && errorMessage) {
      task.errorMessage = errorMessage;
    } else if (targetStatus !== 'abnormal') {
      task.errorMessage = undefined;
    }

    if (targetStatus === 'geometry_check' && !task.startedAt) {
      task.startedAt = now;
      task.currentStage = 'geometry_validation';
    } else if (targetStatus === 'bem_calculation') {
      task.currentStage = 'acoustic_simulation';
    } else if (targetStatus === 'visualization') {
      task.currentStage = 'result_rendering';
    } else if (targetStatus === 'completed') {
      task.completedAt = now;
      task.currentStage = 'finished';
      task.progressPercent = 100;
    } else if (targetStatus === 'abnormal') {
      task.currentStage = 'error_detected';
    }

    this.tasks.set(taskId, task);
    return this.sanitizeTask(task);
  }

  updateProgress(taskId: string, progressPercent: number): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.progressPercent = Math.min(100, Math.max(0, progressPercent));
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);
    return this.sanitizeTask(task);
  }

  getStatusHistory(taskId: string): TaskStatusTransition[] {
    const task = this.tasks.get(taskId);
    return task ? task.statusHistory : [];
  }

  checkTimeouts(): string[] {
    const now = Date.now();
    const timedOutTasks: string[] = [];

    for (const [taskId, task] of this.tasks) {
      if (
        task.status !== 'completed' &&
        task.status !== 'abnormal' &&
        now - task.lastStatusChangeAt > STATUS_TIMEOUT_MS
      ) {
        try {
          this.transitionStatus(
            taskId,
            'abnormal',
            'chief',
            `Task timed out in status '${task.status}' after 24 hours`,
          );
          timedOutTasks.push(taskId);
        } catch (error) {
          console.error(`Failed to mark task ${taskId} as timed out:`, error);
        }
      }
    }

    return timedOutTasks;
  }

  deleteTask(taskId: string): boolean {
    this.results.delete(taskId);
    return this.tasks.delete(taskId);
  }

  setCalculationResult(taskId: string, result: CalculationResult): void {
    this.results.set(taskId, result);
  }

  getCalculationResult(taskId: string): CalculationResult | null {
    return this.results.get(taskId) || null;
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.status === status)
      .map((t) => this.sanitizeTask(t));
  }

  getTasksByCreator(creatorId: string): Task[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.creatorId === creatorId)
      .map((t) => this.sanitizeTask(t));
  }

  private startTimeoutChecker(): void {
    this.timeoutCheckInterval = setInterval(() => {
      try {
        const timedOut = this.checkTimeouts();
        if (timedOut.length > 0) {
          console.log(`[TaskService] Marked ${timedOut.length} tasks as timed out`);
        }
      } catch (error) {
        console.error('[TaskService] Timeout check failed:', error);
      }
    }, 60 * 1000);
  }

  stopTimeoutChecker(): void {
    if (this.timeoutCheckInterval) {
      clearInterval(this.timeoutCheckInterval);
      this.timeoutCheckInterval = null;
    }
  }

  private sanitizeTask(task: TaskStoreItem): Task {
    const { statusHistory, lastStatusChangeAt, ...sanitized } = task;
    return sanitized as Task;
  }

  destroy(): void {
    this.stopTimeoutChecker();
    this.tasks.clear();
  }
}

export const taskService = new TaskService();

export {
  TaskService,
  TaskStateMachineError,
  TaskNotFoundError,
  VALID_TRANSITIONS,
  STATUS_TIMEOUT_MS,
};
export type { TaskStatusTransition, TaskStoreItem };
