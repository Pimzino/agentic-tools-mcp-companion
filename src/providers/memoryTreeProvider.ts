import * as vscode from 'vscode';
import { Memory } from '../models/index';
import { MemoryService } from '../services/memoryService';
import { WorkspaceUtils } from '../utils/index';

/**
 * Tree item types for the memory tree
 */
export type MemoryTreeItemType = 'memory' | 'category' | 'search-prompt' | 'clear-search';

/**
 * Tree item for the memory tree view
 */
export class MemoryTreeItem extends vscode.TreeItem {
  constructor(
    public readonly type: MemoryTreeItemType,
    public readonly data: Memory | string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly parent?: MemoryTreeItem
  ) {
    super(
      type === 'search-prompt' ? 'Search memories...' :
      type === 'clear-search' ? 'Back to categories' :
      type === 'category' ? `📁 ${data as string}` :
      (data as Memory).content.substring(0, 50) + ((data as Memory).content.length > 50 ? '...' : ''),
      collapsibleState
    );

    this.tooltip = this.getTooltip();
    this.description = this.getDescription();
    this.iconPath = this.getIcon();
    this.contextValue = this.getContextValue();
    this.id = type === 'search-prompt' ? 'search-prompt' :
              type === 'clear-search' ? 'clear-search' :
              type === 'category' ? `category-${data}` :
              `memory-${(data as Memory).id}`;
  }

  private getTooltip(): string {
    switch (this.type) {
      case 'search-prompt':
        return 'Click to search memories';
      case 'clear-search':
        return 'Return to category view';
      case 'category':
        return `Category: ${this.data as string}`;
      case 'memory':
        const memory = this.data as Memory;
        return `${memory.content}\n\nCategory: ${memory.category || 'None'}\nImportance: ${memory.importance || 'None'}\nCreated: ${new Date(memory.createdAt).toLocaleString()}`;
    }
  }

  private getDescription(): string {
    if (this.type === 'memory') {
      const memory = this.data as Memory;
      return memory.importance ? `⭐${memory.importance}` : '';
    }
    return '';
  }

  private getIcon(): vscode.ThemeIcon {
    switch (this.type) {
      case 'search-prompt':
        return new vscode.ThemeIcon('search');
      case 'clear-search':
        return new vscode.ThemeIcon('home');
      case 'category':
        return new vscode.ThemeIcon('folder');
      case 'memory':
        return new vscode.ThemeIcon('note');
    }
  }

  private getContextValue(): string {
    return this.type;
  }
}

/**
 * Tree data provider for the memory management view
 */
export class MemoryTreeProvider implements vscode.TreeDataProvider<MemoryTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<MemoryTreeItem | undefined | null | void> = new vscode.EventEmitter<MemoryTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<MemoryTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private memoryService: MemoryService;
  private searchResults: Memory[] = [];
  private isSearchMode = false;

  constructor() {
    this.memoryService = MemoryService.getInstance();

    // Listen for data changes
    this.memoryService.onDataChanged(() => {
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
   * Set search results and switch to search mode
   */
  setSearchResults(results: Memory[]): void {
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
  getTreeItem(element: MemoryTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children for a tree item
   */
  async getChildren(element?: MemoryTreeItem): Promise<MemoryTreeItem[]> {
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
        case 'category':
          return await this.getMemoriesInCategory(element.data as string);
        default:
          return [];
      }
    } catch (error) {
      console.error('Error getting memory tree children:', error);
      return [];
    }
  }

  /**
   * Get root level items
   */
  private async getRootItems(): Promise<MemoryTreeItem[]> {
    const items: MemoryTreeItem[] = [];

    // Get all memories and group by category
    const memories = await this.memoryService.getMemories();
    const categories = new Set<string>();

    memories.forEach(memory => {
      if (memory.category) {
        categories.add(memory.category);
      }
    });

    // Add category items
    categories.forEach(category => {
      items.push(new MemoryTreeItem(
        'category',
        category,
        vscode.TreeItemCollapsibleState.Collapsed
      ));
    });

    // Add uncategorized memories
    const uncategorizedMemories = memories.filter(m => !m.category);
    uncategorizedMemories.forEach(memory => {
      items.push(new MemoryTreeItem(
        'memory',
        memory,
        vscode.TreeItemCollapsibleState.None
      ));
    });

    return items;
  }

  /**
   * Get search result items
   */
  private getSearchResultItems(): MemoryTreeItem[] {
    const items: MemoryTreeItem[] = [];

    // Add "Back to categories" item at the top
    items.push(new MemoryTreeItem(
      'clear-search',
      'clear-search',
      vscode.TreeItemCollapsibleState.None
    ));

    // Add search results
    items.push(...this.searchResults.map(memory => new MemoryTreeItem(
      'memory',
      memory,
      vscode.TreeItemCollapsibleState.None
    )));

    return items;
  }

  /**
   * Get memories in a specific category
   */
  private async getMemoriesInCategory(category: string): Promise<MemoryTreeItem[]> {
    const memories = await this.memoryService.getMemories(undefined, category);
    return memories.map(memory => new MemoryTreeItem(
      'memory',
      memory,
      vscode.TreeItemCollapsibleState.None
    ));
  }

  /**
   * Get parent of a tree item
   */
  getParent(element: MemoryTreeItem): vscode.ProviderResult<MemoryTreeItem> {
    return element.parent;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
