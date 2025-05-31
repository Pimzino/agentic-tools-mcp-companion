/**
 * Data models for parent selection and reassignment functionality
 * These interfaces extend the existing task management system with flexible parent selection
 */

import type { Task } from './task';
import type { Subtask } from './subtask';
import type { CreateTaskInput, UpdateTaskInput } from './task';
import type { CreateSubtaskInput, UpdateSubtaskInput } from './subtask';

// Enhanced input interfaces for flexible parent selection
export interface CreateTaskWithParentInput {
  name: string;
  details: string;
  projectId: string; // Selected parent project
}

export interface CreateSubtaskWithParentInput {
  name: string;
  details: string;
  taskId: string;     // Selected parent task
  projectId?: string; // Inferred from task, but can be explicit for validation
}

// Enhanced update interfaces for reassignment
export interface UpdateTaskWithParentInput extends UpdateTaskInput {
  projectId?: string; // Allow project reassignment
}

export interface UpdateSubtaskWithParentInput extends UpdateSubtaskInput {
  taskId?: string;    // Allow task reassignment
  projectId?: string; // Inferred from new task, but explicit for validation
}

// Parent selection dropdown options
export interface ProjectOption {
  id: string;
  name: string;
  taskCount: number;
}

export interface TaskOption {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  subtaskCount: number;
}

// Move operation tracking
export interface MoveOperationResult {
  success: boolean;
  oldParent: { id: string; name: string; type: 'project' | 'task' };
  newParent: { id: string; name: string; type: 'project' | 'task' };
  warnings?: string[];
}

// Validation results
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiresConfirmation: boolean;
}

// Hierarchy path for navigation and validation
export interface HierarchyPath {
  level: number;
  type: 'project' | 'task' | 'subtask';
  id: string;
  name: string;
}

// Parent validation configuration
export interface ParentValidationRules {
  // Prevent circular references
  preventCircularReferences: boolean;

  // Cross-project move behavior
  allowCrossProjectMoves: boolean;
  requireCrossProjectConfirmation: boolean;

  // Constraints
  maxHierarchyDepth: number; // Currently 3: Project → Task → Subtask
}

// Default validation rules
export const DEFAULT_PARENT_VALIDATION_RULES: ParentValidationRules = {
  preventCircularReferences: true,
  allowCrossProjectMoves: true,
  requireCrossProjectConfirmation: true,
  maxHierarchyDepth: 3
};

// Type guards for enhanced inputs
export function isCreateTaskWithParentInput(input: CreateTaskInput | CreateTaskWithParentInput): input is CreateTaskWithParentInput {
  return 'projectId' in input;
}

export function isCreateSubtaskWithParentInput(input: CreateSubtaskInput | CreateSubtaskWithParentInput): input is CreateSubtaskWithParentInput {
  return 'taskId' in input;
}

export function isUpdateTaskWithParentInput(input: UpdateTaskInput | UpdateTaskWithParentInput): input is UpdateTaskWithParentInput {
  return 'projectId' in input;
}

export function isUpdateSubtaskWithParentInput(input: UpdateSubtaskInput | UpdateSubtaskWithParentInput): input is UpdateSubtaskWithParentInput {
  return 'taskId' in input || 'projectId' in input;
}