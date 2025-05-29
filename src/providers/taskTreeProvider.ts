import * as vscode from 'vscode';
import { Project, Task, Subtask } from '../models/index';
import { TaskService } from '../services/taskService';
import { WorkspaceUtils } from '../utils/index';

/**
 * Tree item types for the task tree
 */
export type TaskTreeItemType = 'project' | 'task' | 'subtask';

/**
 * Tree item for the task tree view
 */
export class TaskTreeItem extends vscode.TreeItem {
  constructor(
    public readonly type: TaskTreeItemType,
    public readonly data: Project | Task | Subtask,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly parent?: TaskTreeItem
  ) {
    super(data.name, collapsibleState);

    this.tooltip = this.getTooltip();
    this.description = this.getDescription();
    this.iconPath = this.getIcon();
    this.contextValue = this.getContextValue();
    this.id = `${type}-${data.id}`;
  }

  private getTooltip(): string {
    switch (this.type) {
      case 'project':
        const project = this.data as Project;
        return `${project.description}\n\nCreated: ${new Date(project.createdAt).toLocaleString()}`;
      case 'task':
        const task = this.data as Task;
        return `${task.details}\n\nStatus: ${task.completed ? 'Completed' : 'Pending'}\nCreated: ${new Date(task.createdAt).toLocaleString()}`;
      case 'subtask':
        const subtask = this.data as Subtask;
        return `${subtask.details}\n\nStatus: ${subtask.completed ? 'Completed' : 'Pending'}\nCreated: ${new Date(subtask.createdAt).toLocaleString()}`;
    }
  }

  private getDescription(): string {
    // No description needed - completion status is shown via icon change
    return '';
  }

  private getIcon(): vscode.ThemeIcon {
    switch (this.type) {
      case 'project':
        return new vscode.ThemeIcon('folder');
      case 'task':
        const task = this.data as Task;
        return new vscode.ThemeIcon(task.completed ? 'check' : 'circle-outline');
      case 'subtask':
        const subtask = this.data as Subtask;
        return new vscode.ThemeIcon(subtask.completed ? 'check' : 'circle-outline');
    }
  }

  private getContextValue(): string {
    const completed = this.type !== 'project' && (this.data as Task | Subtask).completed;
    return `${this.type}${completed ? '-completed' : ''}`;
  }
}

/**
 * Tree data provider for the task management view
 */
export class TaskTreeProvider implements vscode.TreeDataProvider<TaskTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TaskTreeItem | undefined | null | void> = new vscode.EventEmitter<TaskTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TaskTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private taskService: TaskService;

  constructor() {
    this.taskService = TaskService.getInstance();

    // Listen for data changes
    this.taskService.onDataChanged(() => {
      this.refresh();
    });

    // Listen for workspace changes
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.refresh();
    });
  }

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get tree item representation
   */
  getTreeItem(element: TaskTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children for a tree item
   */
  async getChildren(element?: TaskTreeItem): Promise<TaskTreeItem[]> {
    // Check if workspace is available
    if (!WorkspaceUtils.getCurrentWorkspacePath()) {
      return [];
    }

    try {
      if (!element) {
        // Root level - return projects
        return await this.getProjectItems();
      }

      switch (element.type) {
        case 'project':
          return await this.getTaskItems(element.data.id);
        case 'task':
          return await this.getSubtaskItems(element.data.id);
        case 'subtask':
          return []; // Subtasks have no children
        default:
          return [];
      }
    } catch (error) {
      console.error('Error getting tree children:', error);
      return [];
    }
  }

  /**
   * Get project tree items
   */
  private async getProjectItems(): Promise<TaskTreeItem[]> {
    const projects = await this.taskService.getProjects();
    return projects.map(project => new TaskTreeItem(
      'project',
      project,
      vscode.TreeItemCollapsibleState.Collapsed
    ));
  }

  /**
   * Get task tree items for a project
   */
  private async getTaskItems(projectId: string): Promise<TaskTreeItem[]> {
    const tasks = await this.taskService.getTasks(projectId);
    return tasks.map(task => new TaskTreeItem(
      'task',
      task,
      vscode.TreeItemCollapsibleState.Collapsed
    ));
  }

  /**
   * Get subtask tree items for a task
   */
  private async getSubtaskItems(taskId: string): Promise<TaskTreeItem[]> {
    const subtasks = await this.taskService.getSubtasks(taskId);
    return subtasks.map(subtask => new TaskTreeItem(
      'subtask',
      subtask,
      vscode.TreeItemCollapsibleState.None
    ));
  }

  /**
   * Get parent of a tree item
   */
  getParent(element: TaskTreeItem): vscode.ProviderResult<TaskTreeItem> {
    return element.parent;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
