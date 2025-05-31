import * as vscode from 'vscode';
import {
  Project,
  Task,
  Subtask,
  CreateProjectInput,
  CreateTaskInput,
  CreateSubtaskInput,
  UpdateProjectInput,
  UpdateTaskInput,
  UpdateSubtaskInput,
  StorageData,
  CreateTaskWithParentInput,
  CreateSubtaskWithParentInput,
  UpdateTaskWithParentInput,
  UpdateSubtaskWithParentInput,
  ProjectOption,
  TaskOption,
  MoveOperationResult,
  ValidationResult,
  HierarchyPath,
  ParentValidationRules,
  DEFAULT_PARENT_VALIDATION_RULES,
  isCreateTaskWithParentInput,
  isCreateSubtaskWithParentInput,
  isUpdateTaskWithParentInput,
  isUpdateSubtaskWithParentInput
} from '../models/index';
import { WorkspaceUtils, FileUtils } from '../utils/index';
import { ConfigUtils, CancellableOperation, PaginatedSearchResult, debounce } from '../utils/configUtils';

export interface SearchTaskInput {
  query: string;
  limit?: number;
  threshold?: number;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export interface TaskSearchResult {
  task: Task;
  score: number;
  projectName: string;
}

export interface PaginatedTaskSearchResult extends PaginatedSearchResult<TaskSearchResult> {}

/**
 * Service class for task management operations
 * Handles all CRUD operations for projects, tasks, and subtasks
 */
export class TaskService {
  private static instance: TaskService;
  private fileWatcher: { dispose: () => void } | null = null;
  private onDataChangedEmitter = new vscode.EventEmitter<void>();
  private debouncedDataChanged: () => void;

  /**
   * Event fired when task data changes
   */
  public readonly onDataChanged = this.onDataChangedEmitter.event;

  private constructor() {
    const config = ConfigUtils.getConfig();
    this.debouncedDataChanged = debounce(() => {
      this.onDataChangedEmitter.fire();
    }, config.fileWatching.debounceMs);

    this.setupFileWatcher();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): TaskService {
    if (!TaskService.instance) {
      TaskService.instance = new TaskService();
    }
    return TaskService.instance;
  }

  /**
   * Setup file watcher for tasks.json
   */
  private setupFileWatcher(): void {
    const tasksFilePath = WorkspaceUtils.getTasksFilePath();
    if (tasksFilePath) {
      this.fileWatcher = FileUtils.watchFile(tasksFilePath, () => {
        this.debouncedDataChanged();
      });
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
      this.fileWatcher = null;
    }
    this.onDataChangedEmitter.dispose();
  }

  /**
   * Load all task data from storage
   */
  async loadData(): Promise<StorageData> {
    const tasksFilePath = WorkspaceUtils.getTasksFilePath();
    if (!tasksFilePath) {
      throw new Error('No workspace folder is open');
    }

    await WorkspaceUtils.ensureAgenticToolsStructure();
    return await FileUtils.readTasksFile(tasksFilePath);
  }

  /**
   * Save task data to storage
   */
  private async saveData(data: StorageData): Promise<void> {
    const tasksFilePath = WorkspaceUtils.getTasksFilePath();
    if (!tasksFilePath) {
      throw new Error('No workspace folder is open');
    }

    await FileUtils.writeTasksFile(tasksFilePath, data);
    this.debouncedDataChanged();
  }

  // Project operations

  /**
   * Get all projects
   */
  async getProjects(): Promise<Project[]> {
    const data = await this.loadData();
    return data.projects;
  }

  /**
   * Get a project by ID
   */
  async getProject(id: string): Promise<Project | null> {
    const data = await this.loadData();
    return data.projects.find(p => p.id === id) || null;
  }

  /**
   * Create a new project
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    const data = await this.loadData();
    const now = FileUtils.getCurrentTimestamp();

    const project: Project = {
      id: FileUtils.generateId(),
      name: input.name,
      description: input.description,
      createdAt: now,
      updatedAt: now
    };

    data.projects.push(project);
    await this.saveData(data);

    return project;
  }

  /**
   * Update a project
   */
  async updateProject(id: string, updates: UpdateProjectInput): Promise<Project | null> {
    const data = await this.loadData();
    const projectIndex = data.projects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
      return null;
    }

    const project = data.projects[projectIndex];
    const updatedProject: Project = {
      ...project,
      ...updates,
      updatedAt: FileUtils.getCurrentTimestamp()
    };

    data.projects[projectIndex] = updatedProject;
    await this.saveData(data);

    return updatedProject;
  }

  /**
   * Delete a project and all its tasks and subtasks
   */
  async deleteProject(id: string): Promise<boolean> {
    const data = await this.loadData();
    const projectIndex = data.projects.findIndex(p => p.id === id);

    if (projectIndex === -1) {
      return false;
    }

    // Remove project
    data.projects.splice(projectIndex, 1);

    // Remove all tasks in this project
    data.tasks = data.tasks.filter(t => t.projectId !== id);

    // Remove all subtasks in this project
    data.subtasks = data.subtasks.filter(s => s.projectId !== id);

    await this.saveData(data);
    return true;
  }

  // Task operations

  /**
   * Get tasks, optionally filtered by project
   */
  async getTasks(projectId?: string): Promise<Task[]> {
    const data = await this.loadData();
    if (projectId) {
      return data.tasks.filter(t => t.projectId === projectId);
    }
    return data.tasks;
  }

  /**
   * Get a task by ID
   */
  async getTask(id: string): Promise<Task | null> {
    const data = await this.loadData();
    return data.tasks.find(t => t.id === id) || null;
  }

  /**
   * Create a new task
   */
  async createTask(input: CreateTaskInput): Promise<Task> {
    const data = await this.loadData();

    // Verify project exists
    const project = data.projects.find(p => p.id === input.projectId);
    if (!project) {
      throw new Error(`Project with ID ${input.projectId} not found`);
    }

    const now = FileUtils.getCurrentTimestamp();
    const task: Task = {
      id: FileUtils.generateId(),
      name: input.name,
      details: input.details,
      projectId: input.projectId,
      completed: false,
      createdAt: now,
      updatedAt: now
    };

    data.tasks.push(task);
    await this.saveData(data);

    return task;
  }

  /**
   * Update a task
   */
  async updateTask(id: string, updates: UpdateTaskInput): Promise<Task | null> {
    const data = await this.loadData();
    const taskIndex = data.tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      return null;
    }

    const task = data.tasks[taskIndex];
    const updatedTask: Task = {
      ...task,
      ...updates,
      updatedAt: FileUtils.getCurrentTimestamp()
    };

    data.tasks[taskIndex] = updatedTask;
    await this.saveData(data);

    return updatedTask;
  }

  /**
   * Delete a task and all its subtasks
   */
  async deleteTask(id: string): Promise<boolean> {
    const data = await this.loadData();
    const taskIndex = data.tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      return false;
    }

    // Remove task
    data.tasks.splice(taskIndex, 1);

    // Remove all subtasks of this task
    data.subtasks = data.subtasks.filter(s => s.taskId !== id);

    await this.saveData(data);
    return true;
  }

  // Subtask operations

  /**
   * Get subtasks, optionally filtered by task or project
   */
  async getSubtasks(taskId?: string, projectId?: string): Promise<Subtask[]> {
    const data = await this.loadData();
    let subtasks = data.subtasks;

    if (taskId) {
      subtasks = subtasks.filter(s => s.taskId === taskId);
    }

    if (projectId) {
      subtasks = subtasks.filter(s => s.projectId === projectId);
    }

    return subtasks;
  }

  /**
   * Get a subtask by ID
   */
  async getSubtask(id: string): Promise<Subtask | null> {
    const data = await this.loadData();
    return data.subtasks.find(s => s.id === id) || null;
  }

  /**
   * Create a new subtask
   */
  async createSubtask(input: CreateSubtaskInput): Promise<Subtask> {
    const data = await this.loadData();

    // Verify task exists
    const task = data.tasks.find(t => t.id === input.taskId);
    if (!task) {
      throw new Error(`Task with ID ${input.taskId} not found`);
    }

    const now = FileUtils.getCurrentTimestamp();
    const subtask: Subtask = {
      id: FileUtils.generateId(),
      name: input.name,
      details: input.details,
      taskId: input.taskId,
      projectId: task.projectId, // Inherit from parent task
      completed: false,
      createdAt: now,
      updatedAt: now
    };

    data.subtasks.push(subtask);
    await this.saveData(data);

    return subtask;
  }

  /**
   * Update a subtask
   */
  async updateSubtask(id: string, updates: UpdateSubtaskInput): Promise<Subtask | null> {
    const data = await this.loadData();
    const subtaskIndex = data.subtasks.findIndex(s => s.id === id);

    if (subtaskIndex === -1) {
      return null;
    }

    const subtask = data.subtasks[subtaskIndex];
    const updatedSubtask: Subtask = {
      ...subtask,
      ...updates,
      updatedAt: FileUtils.getCurrentTimestamp()
    };

    data.subtasks[subtaskIndex] = updatedSubtask;
    await this.saveData(data);

    return updatedSubtask;
  }

  /**
   * Delete a subtask
   */
  async deleteSubtask(id: string): Promise<boolean> {
    const data = await this.loadData();
    const subtaskIndex = data.subtasks.findIndex(s => s.id === id);

    if (subtaskIndex === -1) {
      return false;
    }

    data.subtasks.splice(subtaskIndex, 1);
    await this.saveData(data);
    return true;
  }

  /**
   * Get project hierarchy with tasks and subtasks
   */
  async getProjectHierarchy(): Promise<Array<Project & { tasks: Array<Task & { subtasks: Subtask[] }> }>> {
    const data = await this.loadData();

    return data.projects.map(project => {
      const projectTasks = data.tasks
        .filter(task => task.projectId === project.id)
        .map(task => ({
          ...task,
          subtasks: data.subtasks.filter(subtask => subtask.taskId === task.id)
        }));

      return {
        ...project,
        tasks: projectTasks
      };
    });
  }

  /**
   * Search tasks using text-based matching with pagination support
   */
  async searchTasks(input: SearchTaskInput): Promise<TaskSearchResult[]> {
    const config = ConfigUtils.getConfig();
    const data = await this.loadData();
    const query = input.query.toLowerCase();
    const results: TaskSearchResult[] = [];
    const threshold = input.threshold ?? config.search.threshold;
    const maxResults = input.limit ?? config.search.maxResults;

    // Check for cancellation
    if (input.signal?.aborted) {
      throw new Error('Search operation was cancelled');
    }

    // Create a map of project names for quick lookup
    const projectMap = new Map(data.projects.map(p => [p.id, p.name]));

    for (const task of data.tasks) {
      // Check for cancellation during processing
      if (input.signal?.aborted) {
        throw new Error('Search operation was cancelled');
      }

      const score = this.calculateTaskRelevanceScore(task, query, config.performance);

      // Early termination for very low scores
      if (config.performance.enableEarlyTermination && score < config.performance.lowScoreThreshold) {
        continue;
      }

      if (score >= threshold) {
        const projectName = projectMap.get(task.projectId) || 'Unknown Project';
        results.push({
          task,
          score,
          projectName
        });

        // Stop if we've reached max results to prevent excessive processing
        if (results.length >= maxResults) {
          break;
        }
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Apply final limit
    return results.slice(0, maxResults);
  }

  /**
   * Search tasks with pagination support
   */
  async searchTasksPaginated(input: SearchTaskInput): Promise<PaginatedTaskSearchResult> {
    const config = ConfigUtils.getConfig();
    const pageSize = input.pageSize ?? config.search.pageSize;
    const page = input.page ?? 1;

    // Get all search results first
    const allResults = await this.searchTasks(input);

    // Apply pagination
    return ConfigUtils.paginateResults(allResults, page, pageSize);
  }

  /**
   * Calculate relevance score for task search with performance optimizations
   */
  private calculateTaskRelevanceScore(
    task: Task,
    query: string,
    performanceConfig?: { enableEarlyTermination: boolean; lowScoreThreshold: number }
  ): number {
    const name = task.name.toLowerCase();
    const details = task.details.toLowerCase();
    let score = 0;

    // Name matches (higher weight) - prioritize exact matches
    if (name.includes(query)) {
      if (name === query) {
        score += 1.0; // Exact match
      } else if (name.startsWith(query)) {
        score += 0.8; // Name starts with query
      } else if (name.endsWith(query)) {
        score += 0.6; // Name ends with query
      } else {
        score += 0.4; // Name contains query
      }
    }

    // Early termination if enabled and score is already very low
    if (performanceConfig?.enableEarlyTermination && score < performanceConfig.lowScoreThreshold) {
      return score;
    }

    // Details matches (lower weight) - only process if we haven't found a good name match
    if (score < 0.8 && details.includes(query)) {
      const detailsWords = details.split(/\s+/);
      const queryWords = query.split(/\s+/);

      // Optimize by checking word boundaries for better matching
      let wordMatches = 0;
      for (const queryWord of queryWords) {
        if (details.includes(queryWord)) {
          wordMatches++;
        }
      }

      if (wordMatches > 0) {
        const matchRatio = wordMatches / queryWords.length;
        score += matchRatio * 0.3;
      }
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Validate workspace structure
   */
  async validateWorkspace(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check if workspace is open
    if (!WorkspaceUtils.getCurrentWorkspacePath()) {
      errors.push('No workspace folder is open');
      return { isValid: false, errors };
    }

    // Check permissions
    if (!(await WorkspaceUtils.validatePermissions())) {
      errors.push('Insufficient permissions to access workspace folder');
    }

    // Check if .agentic-tools-mcp structure exists
    if (!(await WorkspaceUtils.hasAgenticToolsStructure())) {
      errors.push('.agentic-tools-mcp structure not found (will be created automatically)');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Parent Selection Methods

  /**
   * Get all projects available for task creation/assignment
   */
  async getAvailableProjects(): Promise<ProjectOption[]> {
    const data = await this.loadData();

    const projectOptions: ProjectOption[] = [];

    for (const project of data.projects) {
      const taskCount = data.tasks.filter(t => t.projectId === project.id).length;

      projectOptions.push({
        id: project.id,
        name: project.name,
        taskCount
      });
    }

    return projectOptions.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get all tasks available for subtask assignment (excluding current subtask's descendants)
   */
  async getAvailableTasksForSubtask(currentSubtaskId?: string): Promise<TaskOption[]> {
    const data = await this.loadData();

    const taskOptions: TaskOption[] = [];
    const projectMap = new Map(data.projects.map(p => [p.id, p.name]));

    for (const task of data.tasks) {
      // Skip the current subtask's parent task if editing
      if (currentSubtaskId) {
        const currentSubtask = data.subtasks.find(s => s.id === currentSubtaskId);
        if (currentSubtask && task.id === currentSubtask.taskId) {
          continue;
        }
      }

      const subtaskCount = data.subtasks.filter(s => s.taskId === task.id).length;
      const projectName = projectMap.get(task.projectId) || 'Unknown Project';

      taskOptions.push({
        id: task.id,
        name: task.name,
        projectId: task.projectId,
        projectName,
        subtaskCount
      });
    }

    return taskOptions.sort((a, b) => {
      // Sort by project name first, then task name
      const projectCompare = a.projectName.localeCompare(b.projectName);
      return projectCompare !== 0 ? projectCompare : a.name.localeCompare(b.name);
    });
  }

  /**
   * Get tasks within a specific project for subtask assignment
   */
  async getTasksInProject(projectId: string, excludeSubtaskId?: string): Promise<TaskOption[]> {
    const data = await this.loadData();

    const project = data.projects.find(p => p.id === projectId);
    if (!project) {
      return [];
    }

    const taskOptions: TaskOption[] = [];
    const projectTasks = data.tasks.filter(t => t.projectId === projectId);

    for (const task of projectTasks) {
      // Skip the current subtask's parent task if editing
      if (excludeSubtaskId) {
        const currentSubtask = data.subtasks.find(s => s.id === excludeSubtaskId);
        if (currentSubtask && task.id === currentSubtask.taskId) {
          continue;
        }
      }

      const subtaskCount = data.subtasks.filter(s => s.taskId === task.id).length;

      taskOptions.push({
        id: task.id,
        name: task.name,
        projectId: task.projectId,
        projectName: project.name,
        subtaskCount
      });
    }

    return taskOptions.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Move Operation Methods

  /**
   * Move task to different project
   */
  async moveTaskToProject(taskId: string, newProjectId: string): Promise<MoveOperationResult> {
    const validation = await this.validateParentAssignment('task', taskId, newProjectId);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const data = await this.loadData();
    const task = data.tasks.find(t => t.id === taskId);
    const oldProject = data.projects.find(p => p.id === task?.projectId);
    const newProject = data.projects.find(p => p.id === newProjectId);

    if (!task || !oldProject || !newProject) {
      throw new Error('Task or project not found');
    }

    // Update task
    const taskIndex = data.tasks.findIndex(t => t.id === taskId);
    data.tasks[taskIndex] = {
      ...task,
      projectId: newProjectId,
      updatedAt: FileUtils.getCurrentTimestamp()
    };

    // Update all subtasks of this task
    const subtasks = data.subtasks.filter(s => s.taskId === taskId);
    for (let i = 0; i < data.subtasks.length; i++) {
      if (data.subtasks[i].taskId === taskId) {
        data.subtasks[i] = {
          ...data.subtasks[i],
          projectId: newProjectId,
          updatedAt: FileUtils.getCurrentTimestamp()
        };
      }
    }

    await this.saveData(data);

    return {
      success: true,
      oldParent: { id: oldProject.id, name: oldProject.name, type: 'project' },
      newParent: { id: newProject.id, name: newProject.name, type: 'project' },
      warnings: validation.warnings
    };
  }

  /**
   * Move subtask to different task (potentially different project)
   */
  async moveSubtaskToTask(subtaskId: string, newTaskId: string): Promise<MoveOperationResult> {
    const validation = await this.validateParentAssignment('subtask', subtaskId, newTaskId);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const data = await this.loadData();
    const subtask = data.subtasks.find(s => s.id === subtaskId);
    const oldTask = data.tasks.find(t => t.id === subtask?.taskId);
    const newTask = data.tasks.find(t => t.id === newTaskId);

    if (!subtask || !oldTask || !newTask) {
      throw new Error('Subtask or task not found');
    }

    // Update subtask
    const subtaskIndex = data.subtasks.findIndex(s => s.id === subtaskId);
    data.subtasks[subtaskIndex] = {
      ...subtask,
      taskId: newTaskId,
      projectId: newTask.projectId,
      updatedAt: FileUtils.getCurrentTimestamp()
    };

    await this.saveData(data);

    return {
      success: true,
      oldParent: { id: oldTask.id, name: oldTask.name, type: 'task' },
      newParent: { id: newTask.id, name: newTask.name, type: 'task' },
      warnings: validation.warnings
    };
  }

  // Validation Methods

  /**
   * Validate proposed parent assignment
   */
  async validateParentAssignment(
    itemType: 'task' | 'subtask',
    itemId: string | null,
    newParentId: string
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      requiresConfirmation: false
    };

    const data = await this.loadData();

    if (itemType === 'task') {
      // Validate project exists
      const project = data.projects.find(p => p.id === newParentId);
      if (!project) {
        result.isValid = false;
        result.errors.push('Selected project does not exist');
        return result;
      }

      // Check for cross-project move
      if (itemId) {
        const task = data.tasks.find(t => t.id === itemId);
        if (task && task.projectId !== newParentId) {
          result.warnings.push('This will move the task and all its subtasks to a different project');
          result.requiresConfirmation = true;
        }
      }
    } else {
      // Validate task exists
      const task = data.tasks.find(t => t.id === newParentId);
      if (!task) {
        result.isValid = false;
        result.errors.push('Selected task does not exist');
        return result;
      }

      // Check for circular reference (currently not possible with subtasks, but keeping for extensibility)
      if (itemId) {
        const isCircular = await this.wouldCreateCircularReference(itemId, newParentId);
        if (isCircular) {
          result.isValid = false;
          result.errors.push('Cannot move subtask to its own descendant');
          return result;
        }

        // Check for cross-project move
        const subtask = data.subtasks.find(s => s.id === itemId);
        if (subtask && subtask.projectId !== task.projectId) {
          result.warnings.push('This will move the subtask to a different project');
          result.requiresConfirmation = true;
        }
      }
    }

    return result;
  }

  /**
   * Get hierarchy path for an item
   */
  async getHierarchyPath(itemType: 'task' | 'subtask', itemId: string): Promise<HierarchyPath[]> {
    const data = await this.loadData();
    const path: HierarchyPath[] = [];

    if (itemType === 'task') {
      const task = data.tasks.find(t => t.id === itemId);
      if (task) {
        const project = data.projects.find(p => p.id === task.projectId);
        if (project) {
          path.push({ level: 0, type: 'project', id: project.id, name: project.name });
          path.push({ level: 1, type: 'task', id: task.id, name: task.name });
        }
      }
    } else {
      const subtask = data.subtasks.find(s => s.id === itemId);
      if (subtask) {
        const task = data.tasks.find(t => t.id === subtask.taskId);
        if (task) {
          const project = data.projects.find(p => p.id === task.projectId);
          if (project) {
            path.push({ level: 0, type: 'project', id: project.id, name: project.name });
            path.push({ level: 1, type: 'task', id: task.id, name: task.name });
            path.push({ level: 2, type: 'subtask', id: subtask.id, name: subtask.name });
          }
        }
      }
    }

    return path;
  }

  /**
   * Check if moving an item would create a circular reference
   * Currently not possible with the 3-level hierarchy, but keeping for future extensibility
   */
  private async wouldCreateCircularReference(_itemId: string, _newParentId: string): Promise<boolean> {
    // For the current 3-level hierarchy (Project → Task → Subtask),
    // subtasks can't have children, so no circular reference is possible
    // But we keep this method for future extensibility
    return false;
  }

  // Enhanced CRUD Methods

  /**
   * Enhanced createTask with flexible parent selection
   */
  async createTaskWithParent(input: CreateTaskInput | CreateTaskWithParentInput): Promise<Task> {
    // Validate project exists
    const project = await this.getProject(input.projectId);
    if (!project) {
      throw new Error(`Project with ID ${input.projectId} not found`);
    }

    // Use existing createTask method
    return this.createTask(input);
  }

  /**
   * Enhanced createSubtask with parent validation
   */
  async createSubtaskWithParent(input: CreateSubtaskInput | CreateSubtaskWithParentInput): Promise<Subtask> {
    // Validate task exists and get its project
    const task = await this.getTask(input.taskId);
    if (!task) {
      throw new Error(`Task with ID ${input.taskId} not found`);
    }

    // Use existing createSubtask method
    return this.createSubtask(input);
  }

  /**
   * Enhanced updateTask with optional parent reassignment
   */
  async updateTaskWithParent(id: string, updates: UpdateTaskInput | UpdateTaskWithParentInput): Promise<Task | null> {
    // Check if this includes a parent change
    if (isUpdateTaskWithParentInput(updates) && updates.projectId) {
      const currentTask = await this.getTask(id);
      if (currentTask && currentTask.projectId !== updates.projectId) {
        // This is a move operation
        await this.moveTaskToProject(id, updates.projectId);

        // Remove projectId from updates to avoid double-processing
        const { projectId, ...remainingUpdates } = updates;
        if (Object.keys(remainingUpdates).length > 0) {
          return this.updateTask(id, remainingUpdates);
        } else {
          return this.getTask(id);
        }
      }
    }

    // Use existing updateTask method
    return this.updateTask(id, updates);
  }

  /**
   * Enhanced updateSubtask with optional parent reassignment
   */
  async updateSubtaskWithParent(id: string, updates: UpdateSubtaskInput | UpdateSubtaskWithParentInput): Promise<Subtask | null> {
    // Check if this includes a parent change
    if (isUpdateSubtaskWithParentInput(updates) && updates.taskId) {
      const currentSubtask = await this.getSubtask(id);
      if (currentSubtask && currentSubtask.taskId !== updates.taskId) {
        // This is a move operation
        await this.moveSubtaskToTask(id, updates.taskId);

        // Remove taskId and projectId from updates to avoid double-processing
        const { taskId, projectId, ...remainingUpdates } = updates;
        if (Object.keys(remainingUpdates).length > 0) {
          return this.updateSubtask(id, remainingUpdates);
        } else {
          return this.getSubtask(id);
        }
      }
    }

    // Use existing updateSubtask method
    return this.updateSubtask(id, updates);
  }
}
