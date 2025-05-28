/**
 * Task data model for the task management system
 * This interface matches exactly with the MCP server implementation
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
}
