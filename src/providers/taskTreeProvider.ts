import * as vscode from 'vscode';
import { Project, Task, Subtask } from '../models/index';
import { TaskService, TaskSearchResult } from '../services/taskService';
import { WorkspaceUtils } from '../utils/index';
import { isTaskSearchResult } from '../types/formTypes';

/**
 * Tree item types for the task tree
 * Version 2.0: Updated for unified task model
 */
export type TaskTreeItemType = 'project' | 'task' | 'search-prompt' | 'clear-search';

/**
 * Tree item for the task tree view
 * Version 2.0: Updated for unlimited task hierarchy
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
          const statusText = task.status || (task.completed ? 'done' : 'pending');
          const priorityText = task.priority ? `Priority: ${task.priority}/10` : '';
          const complexityText = task.complexity ? `Complexity: ${task.complexity}/10` : '';
          const tagsText = task.tags && task.tags.length > 0 ? `Tags: ${task.tags.join(', ')}` : '';
          const timeText = task.estimatedHours ? `Estimated: ${task.estimatedHours}h` : '';
          const actualTimeText = task.actualHours ? `Actual: ${task.actualHours}h` : '';
          const depsText = task.dependsOn && task.dependsOn.length > 0 ? `Dependencies: ${task.dependsOn.length}` : '';
          const levelText = task.level !== undefined ? `Level: ${task.level}` : '';

          const details = [
            task.details,
            `Project: ${this.data.projectName}`,
            `Status: ${statusText}`,
            levelText,
            priorityText,
            complexityText,
            tagsText,
            timeText,
            actualTimeText,
            depsText,
            `Relevance: ${Math.round(this.data.score * 100)}%`,
            `Created: ${new Date(task.createdAt).toLocaleString()}`
          ].filter(Boolean).join('\n');

          return details;
        } else {
          // Regular task (including legacy subtasks treated as tasks)
          const task = this.data as Task;
          const statusText = task.status || (task.completed ? 'done' : 'pending');
          const priorityText = task.priority ? `Priority: ${task.priority}/10` : '';
          const complexityText = task.complexity ? `Complexity: ${task.complexity}/10` : '';
          const tagsText = task.tags && task.tags.length > 0 ? `Tags: ${task.tags.join(', ')}` : '';
          const timeText = task.estimatedHours ? `Estimated: ${task.estimatedHours}h` : '';
          const actualTimeText = task.actualHours ? `Actual: ${task.actualHours}h` : '';
          const depsText = task.dependsOn && task.dependsOn.length > 0 ? `Dependencies: ${task.dependsOn.length}` : '';
          const levelText = task.level !== undefined ? `Level: ${task.level}` : '';
          const parentText = task.parentId ? 'Has parent' : 'Top-level';

          const details = [
            task.details,
            `Status: ${statusText}`,
            `${parentText}${levelText ? ` (${levelText})` : ''}`,
            priorityText,
            complexityText,
            tagsText,
            timeText,
            actualTimeText,
            depsText,
            `Created: ${new Date(task.createdAt).toLocaleString()}`
          ].filter(Boolean).join('\n');

          return details;
        }
    }
  }

  private getDescription(): string {
    if (this.type === 'task') {
      let task: Task;
      if (isTaskSearchResult(this.data)) {
        task = this.data.task;
      } else {
        task = this.data as Task;
      }

      const parts: string[] = [];

      // Add level indicator for hierarchy
      if (task.level !== undefined && task.level > 0) {
        parts.push(`L${task.level}`);
      }

      // Add status indicator
      if (task.status) {
        const statusEmoji = {
          'pending': '⏳',
          'in-progress': '🔄',
          'blocked': '🚫',
          'done': '✅'
        }[task.status] || '';
        if (statusEmoji) parts.push(statusEmoji);
      }

      // Add priority indicator
      if (task.priority && task.priority >= 8) {
        parts.push('🔥'); // High priority
      } else if (task.priority && task.priority >= 6) {
        parts.push('⚡'); // Medium priority
      }

      // Add complexity indicator
      if (task.complexity && task.complexity >= 8) {
        parts.push('🧩'); // High complexity
      }

      // Add time tracking
      if (task.estimatedHours) {
        parts.push(`${task.estimatedHours}h`);
      }

      return parts.join(' ');
    }

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
          // Regular task (unified model)
          const task = this.data as Task;
          // Use different icons based on hierarchy level
          if (task.level === undefined || task.level === 0) {
            return new vscode.ThemeIcon(task.completed ? 'check' : 'circle-outline');
          } else {
            return new vscode.ThemeIcon(task.completed ? 'check' : 'dot');
          }
        }
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

    if (this.type === 'task') {
      const task = this.data as Task;
      const completed = task.completed;
      const level = task.level || 0;
      return `task${completed ? '-completed' : ''}-level-${level}`;
    }

    return this.type;
  }
}

/**
 * Tree data provider for the task management view
 * Version 2.0: Updated for unlimited task hierarchy
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
  handleItemMoved(_itemType: 'task', _itemId: string, _oldParentId: string, _newParentId: string): void {
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
          return await this.getTopLevelTaskItems((element.data as Project).id);
        case 'task':
          if (isTaskSearchResult(element.data)) {
            // Search result task - no children in search mode
            return [];
          } else {
            // Regular task - return child tasks (unlimited depth)
            return await this.getChildTaskItems((element.data as Task).id);
          }
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
   * Get top-level task tree items for a project (parentId = undefined)
   */
  private async getTopLevelTaskItems(projectId: string): Promise<TaskTreeItem[]> {
    try {
      // Get tasks with no parent (top-level tasks)
      const tasks = await this.taskService.getTasksByParent(projectId, undefined);

      return await Promise.all(tasks.map(async task => {
        // Check if task has children to determine collapsible state
        const hasChildren = await this.taskHasChildren(task.id);

        return new TaskTreeItem(
          'task',
          task,
          hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
        );
      }));
    } catch (error) {
      console.error('Error getting top-level tasks:', error);
      return [];
    }
  }

  /**
   * Get child task tree items for a parent task (unlimited depth)
   */
  private async getChildTaskItems(parentTaskId: string): Promise<TaskTreeItem[]> {
    try {
      const parentTask = await this.taskService.getTask(parentTaskId);
      if (!parentTask) {
        return [];
      }

      // Get child tasks for this parent
      const childTasks = await this.taskService.getTasksByParent(parentTask.projectId, parentTaskId);

      return await Promise.all(childTasks.map(async task => {
        // Check if task has children to determine collapsible state
        const hasChildren = await this.taskHasChildren(task.id);

        return new TaskTreeItem(
          'task',
          task,
          hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
        );
      }));
    } catch (error) {
      console.error('Error getting child tasks:', error);
      return [];
    }
  }

  /**
   * Check if a task has children
   */
  private async taskHasChildren(taskId: string): Promise<boolean> {
    try {
      const task = await this.taskService.getTask(taskId);
      if (!task) {
        return false;
      }

      const children = await this.taskService.getTasksByParent(task.projectId, taskId);
      return children.length > 0;
    } catch (error) {
      console.error('Error checking if task has children:', error);
      return false;
    }
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
