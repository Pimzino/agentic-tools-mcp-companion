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
  StorageData
} from '../models/index';
import { WorkspaceUtils, FileUtils } from '../utils/index';

/**
 * Service class for task management operations
 * Handles all CRUD operations for projects, tasks, and subtasks
 */
export class TaskService {
  private static instance: TaskService;
  private fileWatcher: { dispose: () => void } | null = null;
  private onDataChangedEmitter = new vscode.EventEmitter<void>();

  /**
   * Event fired when task data changes
   */
  public readonly onDataChanged = this.onDataChangedEmitter.event;

  private constructor() {
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
        this.onDataChangedEmitter.fire();
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
    this.onDataChangedEmitter.fire();
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
}
