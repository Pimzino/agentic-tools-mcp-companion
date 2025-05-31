/**
 * Type definitions for form data validation in editors
 */

/**
 * Task form data structure
 */
export interface TaskFormData {
  name: string;
  details: string;
  completed?: boolean;
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