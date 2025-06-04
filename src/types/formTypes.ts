/**
 * Type definitions for form data validation in editors
 */

/**
 * Task form data structure with enhanced fields for MCP server v1.7.0 compatibility
 */
export interface TaskFormData {
  name: string;
  details: string;
  completed?: boolean;
  /** Task dependencies - IDs of tasks that must be completed before this task */
  dependsOn?: string[];
  /** Task priority level (1-10, where 10 is highest priority) */
  priority?: number;
  /** Estimated complexity/effort (1-10, where 10 is most complex) */
  complexity?: number;
  /** Task status (pending, in-progress, blocked, done) */
  status?: 'pending' | 'in-progress' | 'blocked' | 'done';
  /** Tags for categorization and filtering */
  tags?: string[];
  /** Estimated time to complete in hours */
  estimatedHours?: number;
  /** Actual time spent in hours */
  actualHours?: number;
}

/**
 * Subtask form data structure
 */
export interface SubtaskFormData {
  name: string;
  details: string;
  completed?: boolean;
}

/**
 * Extended task form data with parent selection
 */
export interface TaskFormDataWithParent extends TaskFormData {
  projectId: string;
  originalProjectId?: string; // For edit mode comparison
}

/**
 * Extended subtask form data with parent selection
 */
export interface SubtaskFormDataWithParent extends SubtaskFormData {
  taskId: string;
  projectId: string; // Inferred from selected task
  originalTaskId?: string;    // For edit mode comparison
  originalProjectId?: string; // For edit mode comparison
}

/**
 * Project form data structure
 */
export interface ProjectFormData {
  name: string;
  description: string;
}

/**
 * Memory form data structure
 */
export interface MemoryFormData {
  title: string;
  content: string;
  category?: string;
}

/**
 * Form validation result
 */
export interface FormValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Search result with task and project information
 */
export interface TaskSearchResultData {
  task: import('../models/task').Task;
  projectName: string;
  score: number;
}

/**
 * Type guard to check if data has projectName property (search result)
 */
export function isTaskSearchResult(data: unknown): data is TaskSearchResultData {
  return typeof data === 'object' &&
         data !== null &&
         'projectName' in data &&
         'task' in data &&
         'score' in data;
}

/**
 * Type guard to check if data is a Task
 */
export function isTask(data: unknown): data is import('../models/task').Task {
  return typeof data === 'object' &&
         data !== null &&
         'id' in data &&
         'name' in data &&
         'projectId' in data &&
         !('projectName' in data);
}

/**
 * Type guard to check if data is a Project
 */
export function isProject(data: unknown): data is import('../models/project').Project {
  return typeof data === 'object' &&
         data !== null &&
         'id' in data &&
         'name' in data &&
         'description' in data &&
         'createdAt' in data;
}

/**
 * Type guard to check if data is a Subtask
 */
export function isSubtask(data: unknown): data is import('../models/subtask').Subtask {
  return typeof data === 'object' &&
         data !== null &&
         'id' in data &&
         'name' in data &&
         'taskId' in data &&
         'projectId' in data;
}