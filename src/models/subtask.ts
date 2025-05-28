/**
 * Subtask data model for the task management system
 * This interface matches exactly with the MCP server implementation
 */
export interface Subtask {
  /** Unique identifier for the subtask */
  id: string;
  /** Subtask name */
  name: string;
  /** Enhanced subtask description */
  details: string;
  /** Reference to parent task */
  taskId: string;
  /** Reference to parent project for easy querying */
  projectId: string;
  /** Subtask completion status */
  completed: boolean;
  /** Timestamp when the subtask was created */
  createdAt: string;
  /** Timestamp when the subtask was last updated */
  updatedAt: string;
}

/**
 * Input data for creating a new subtask
 */
export interface CreateSubtaskInput {
  /** Subtask name */
  name: string;
  /** Enhanced subtask description */
  details: string;
  /** Reference to parent task */
  taskId: string;
}

/**
 * Input data for updating an existing subtask
 */
export interface UpdateSubtaskInput {
  /** Subtask name (optional) */
  name?: string;
  /** Enhanced subtask description (optional) */
  details?: string;
  /** Subtask completion status (optional) */
  completed?: boolean;
}
