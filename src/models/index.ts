/**
 * Export all data models and types for the VSCode extension
 * These interfaces match exactly with the MCP server implementation
 */

// Task Management Models
export type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
} from './project';

export type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
} from './task';

export type {
  Subtask,
  CreateSubtaskInput,
  UpdateSubtaskInput,
} from './subtask';

// Memory Management Models
export type {
  Memory,
  CreateMemoryInput,
  UpdateMemoryInput,
  SearchMemoryInput,
  MemorySearchResult,
  MemoryConfig,
} from './memory';

export { DEFAULT_MEMORY_CONFIG, MEMORY_CONSTANTS } from './memory';

// Import types for use in interfaces
import type { Project } from './project';
import type { Task } from './task';
import type { Subtask } from './subtask';

/**
 * Data structure for the task storage file
 * This matches the MCP server's storage format
 */
export interface StorageData {
  projects: Project[];
  tasks: Task[];
  subtasks: Subtask[];
}
