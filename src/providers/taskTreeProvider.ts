import * as vscode from 'vscode';
import { Project, Task, Subtask } from '../models/index';
import { TaskService, TaskSearchResult } from '../services/taskService';
import { WorkspaceUtils } from '../utils/index';
import { isTaskSearchResult } from '../types/formTypes';

/**
 * Tree item types for the task tree
 */
export type TaskTreeItemType = 'project' | 'task' | 'subtask' | 'search-prompt' | 'clear-search';

/**
 * Tree item for the task tree view
 */
export class TaskTreeItem extends vscode.TreeItem {
  constructor(
    public readonly type: TaskTreeItemType,
    public readonly data: Project | Task | Subtask | string | TaskSearchResult,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly parent?: TaskTreeItem
  ) {
    super(
      type === 'search-prompt' ? 'Search tasks...' :
      type === 'clear-search' ? 'Back to projects' :
      type === 'task' && isTaskSearchResult(data) ?
        `${data.task.name} (${data.projectName})` :
      (data as Project | Task | Subtask).name,
      collapsibleState
    );

    this.tooltip = this.getTooltip();
    this.description = this.getDescription();
    this.iconPath = this.getIcon();
    this.contextValue = this.getContextValue();
    this.id = type === 'search-prompt' ? 'search-prompt' :
              type === 'clear-search' ? 'clear-search' :
              type === 'task' && isTaskSearchResult(data) ?
                `search-task-${data.task.id}` :
                `${type}-${(data as Project | Task | Subtask).id}`;
  }

  private getTooltip(): string {
    switch (this.type) {
      case 'search-prompt':
        return 'Click to search tasks';
      case 'clear-search':
        return 'Return to project view';
      case 'project':
        const project = this.data as Project;
        return `${project.description}\n\nCreated: ${new Date(project.createdAt).toLocaleString()}`;
      case 'task':
        if (isTaskSearchResult(this.data)) {
          // Search result task
          const task = this.data.task;
          return `${task.details}\n\nProject: ${this.data.projectName}\nStatus: ${task.completed ? 'Completed' : 'Pending'}\nRelevance: ${Math.round(this.data.score * 100)}%\nCreated: ${new Date(task.createdAt).toLocaleString()}`;
        } else {
          // Regular task
          const task = this.data as Task;
          return `${task.details}\n\nStatus: ${task.completed ? 'Completed' : 'Pending'}\nCreated: ${new Date(task.createdAt).toLocaleString()}`;
        }
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
      case 'search-prompt':
        return new vscode.ThemeIcon('search');
      case 'clear-search':
        return new vscode.ThemeIcon('arrow-left');
      case 'project':
        return new vscode.ThemeIcon('folder');
      case 'task':
        if (isTaskSearchResult(this.data)) {
          // Search result task
          const task = this.data.task;
          return new vscode.ThemeIcon(task.completed ? 'check' : 'circle-outline');
        } else {
          // Regular task
          const task = this.data as Task;
          return new vscode.ThemeIcon(task.completed ? 'check' : 'circle-outline');
        }
      case 'subtask':
        const subtask = this.data as Subtask;
        return new vscode.ThemeIcon(subtask.completed ? 'check' : 'circle-outline');
    }
  }

  private getContextValue(): string {
    if (this.type === 'search-prompt' || this.type === 'clear-search') {
      return this.type;
    }

    if (this.type === 'task' && isTaskSearchResult(this.data)) {
      // Search result task
      const task = this.data.task;
      return `task${task.completed ? '-completed' : ''}`;
    }

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
  private searchResults: TaskSearchResult[] = [];
  private isSearchMode = false;

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
   * Refresh the tree view after a parent move operation
   * This ensures the tree structure is updated correctly
   */
  refreshAfterParentMove(): void {
    // Clear any cached state and force full refresh
    this.refresh();
  }

  /**
   * Handle tree state updates when items are moved
   * Ensures proper tree expansion/collapse state is maintained
   */
  handleItemMoved(_itemType: 'task' | 'subtask', _itemId: string, _oldParentId: string, _newParentId: string): void {
    // Fire a targeted refresh to update the tree structure
    // This is more efficient than a full refresh for large trees
    this.refresh();
  }

  /**
   * Set search results and switch to search mode
   */
  setSearchResults(results: TaskSearchResult[]): void {
    this.searchResults = results;
    this.isSearchMode = true;
    this.refresh();
  }

  /**
   * Clear search and return to normal mode
   */
  clearSearch(): void {
    this.searchResults = [];
    this.isSearchMode = false;
    this.refresh();
  }

  /**
   * Check if currently in search mode
   */
  isInSearchMode(): boolean {
    return this.isSearchMode;
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
        // Root level
        if (this.isSearchMode) {
          return this.getSearchResultItems();
        } else {
          return await this.getRootItems();
        }
      }

      switch (element.type) {
        case 'project':
          return await this.getTaskItems((element.data as Project).id);
        case 'task':
          if (isTaskSearchResult(element.data)) {
            // Search result task - no children
            return [];
          } else {
            // Regular task - return subtasks
            return await this.getSubtaskItems((element.data as Task).id);
          }
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
   * Get root items (includes search prompt + projects)
   */
  private async getRootItems(): Promise<TaskTreeItem[]> {
    const items: TaskTreeItem[] = [];

    // Add search prompt at the top
    items.push(new TaskTreeItem(
      'search-prompt',
      'search-prompt',
      vscode.TreeItemCollapsibleState.None
    ));

    // Add projects
    const projects = await this.taskService.getProjects();
    items.push(...projects.map(project => new TaskTreeItem(
      'project',
      project,
      vscode.TreeItemCollapsibleState.Collapsed
    )));

    return items;
  }

  /**
   * Get search result items
   */
  private getSearchResultItems(): TaskTreeItem[] {
    const items: TaskTreeItem[] = [];

    // Add "Back to projects" item at the top
    items.push(new TaskTreeItem(
      'clear-search',
      'clear-search',
      vscode.TreeItemCollapsibleState.None
    ));

    // Add search results
    items.push(...this.searchResults.map(result => new TaskTreeItem(
      'task',
      result,
      vscode.TreeItemCollapsibleState.None
    )));

    return items;
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
