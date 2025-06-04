/**
 * Task data model for the task management system
 * This interface matches exactly with the MCP server implementation (v1.7.0)
 */
export interface Task {
  /** Unique identifier for the task */
  id: string;
  /** Task name */
  name: string;
  /** Enhanced task description */
  details: string;
  /** Reference to parent project */
  projectId: string;
  /** Task completion status */
  completed: boolean;
  /** Timestamp when the task was created */
  createdAt: string;
  /** Timestamp when the task was last updated */
  updatedAt: string;
  /** Task dependencies - IDs of tasks that must be completed before this task */
  dependsOn?: string[];
  /** Task priority level (1-10, where 10 is highest priority) */
  priority?: number;
  /** Estimated complexity/effort (1-10, where 10 is most complex) */
  complexity?: number;
  /** Task status beyond just completed (pending, in-progress, blocked, done) */
  status?: 'pending' | 'in-progress' | 'blocked' | 'done';
  /** Tags for categorization and filtering */
  tags?: string[];
  /** Estimated time to complete in hours */
  estimatedHours?: number;
  /** Actual time spent in hours */
  actualHours?: number;
}

/**
 * Input data for creating a new task
 */
export interface CreateTaskInput {
  /** Task name */
  name: string;
  /** Enhanced task description */
  details: string;
  /** Reference to parent project */
  projectId: string;
  /** Task dependencies - IDs of tasks that must be completed before this task */
  dependsOn?: string[];
  /** Task priority level (1-10, where 10 is highest priority) */
  priority?: number;
  /** Estimated complexity/effort (1-10, where 10 is most complex) */
  complexity?: number;
  /** Task status (defaults to 'pending') */
  status?: 'pending' | 'in-progress' | 'blocked' | 'done';
  /** Tags for categorization and filtering */
  tags?: string[];
  /** Estimated time to complete in hours */
  estimatedHours?: number;
}

/**
 * Input data for updating an existing task
 */
export interface UpdateTaskInput {
  /** Task name (optional) */
  name?: string;
  /** Enhanced task description (optional) */
  details?: string;
  /** Task completion status (optional) */
  completed?: boolean;
  /** Task dependencies - IDs of tasks that must be completed before this task */
  dependsOn?: string[];
  /** Task priority level (1-10, where 10 is highest priority) */
  priority?: number;
  /** Estimated complexity/effort (1-10, where 10 is most complex) */
  complexity?: number;
  /** Task status */
  status?: 'pending' | 'in-progress' | 'blocked' | 'done';
  /** Tags for categorization and filtering */
  tags?: string[];
  /** Estimated time to complete in hours */
  estimatedHours?: number;
  /** Actual time spent in hours */
  actualHours?: number;
}
