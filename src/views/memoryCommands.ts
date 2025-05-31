import * as vscode from 'vscode';
import { MemoryTreeItem, MemoryTreeProvider } from '../providers/memoryTreeProvider';
import { MemoryService } from '../services/memoryService';
import { CreateMemoryInput, UpdateMemoryInput, Memory, MEMORY_CONSTANTS } from '../models/index';
import { MemoryEditor, MemoryEditorData } from '../editors/memoryEditor';
import { ErrorHandler, ErrorUtils, ServiceError } from '../utils/errorHandler';
import { ConfigUtils, CancellableOperation } from '../utils/configUtils';



/**
 * Create a new memory using the rich editor interface
 */
export async function createMemory(memoryService: MemoryService, extensionUri: vscode.Uri): Promise<void> {
  try {
    const memoryEditor = new MemoryEditor(extensionUri, memoryService);

    const editorData: MemoryEditorData = {
      mode: 'create'
    };

    await memoryEditor.show(editorData);
  } catch (error) {
    const serviceError = ErrorUtils.createServiceError('MemoryEditor', 'show', error);
    ErrorHandler.handleError(serviceError, ErrorHandler.createContext('create_memory_editor'));
  }
}

/**
 * Edit a memory using the rich editor interface
 */
export async function editMemory(memoryService: MemoryService, item: MemoryTreeItem, extensionUri: vscode.Uri): Promise<void> {
  if (item.type !== 'memory') {return;}

  const memory = item.data as Memory;
  try {
    const memoryEditor = new MemoryEditor(extensionUri, memoryService);

    const editorData: MemoryEditorData = {
      mode: 'edit',
      memory: memory
    };

    await memoryEditor.show(editorData);
  } catch (error) {
    const serviceError = ErrorUtils.createServiceError('MemoryEditor', 'show', error);
    ErrorHandler.handleError(serviceError, ErrorHandler.createContext('edit_memory_editor', {
      memoryId: memory.id,
      memoryTitle: memory.title
    }));
  }
}

/**
 * Delete a memory
 */
export async function deleteMemory(memoryService: MemoryService, item: MemoryTreeItem): Promise<void> {
  if (item.type !== 'memory') {return;}

  const memory = item.data as Memory;
  try {
    const preview = memory.title;

    const confirmation = await vscode.window.showWarningMessage(
      `Are you sure you want to delete this memory?\n\n"${preview}"`,
      { modal: true },
      'Delete'
    );

    if (confirmation !== 'Delete') {return;}

    await memoryService.deleteMemory(memory.id);
    vscode.window.showInformationMessage('Memory deleted successfully!');
  } catch (error) {
    const serviceError = ErrorUtils.createServiceError('MemoryService', 'deleteMemory', error);
    ErrorHandler.handleError(serviceError, ErrorHandler.createContext('delete_memory', {
      memoryId: memory.id,
      memoryTitle: memory.title
    }));
  }
}

/**
 * Search memories with real-time QuickPick interface with cancellation support
 */
export async function searchMemories(memoryService: MemoryService, memoryTreeProvider: MemoryTreeProvider, extensionUri: vscode.Uri): Promise<void> {
  try {
    const config = ConfigUtils.getConfig();
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = 'Type to search memories...';
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    // Add back to tree view option
    const backItem: vscode.QuickPickItem = {
      label: '$(arrow-left) Back to memories',
      description: 'Return to memory tree view',
      alwaysShow: true
    };

    quickPick.items = [backItem];

    let searchTimeout: NodeJS.Timeout | undefined;
    let currentSearchOperation: CancellableOperation | undefined;

    // Handle real-time search as user types
    quickPick.onDidChangeValue(async (value) => {
      // Cancel previous search operation
      if (currentSearchOperation) {
        currentSearchOperation.cancel();
      }

      // Clear previous timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Debounce search using configured delay
      searchTimeout = setTimeout(async () => {
        if (value.trim().length === 0) {
          // Show only back option when empty
          quickPick.items = [backItem];
          return;
        }

        if (value.trim().length < 2) {
          // Require at least 2 characters
          quickPick.items = [
            backItem,
            {
              label: '$(info) Type at least 2 characters to search',
              description: '',
              detail: ''
            }
          ];
          return;
        }

        // Create new search operation with cancellation support
        currentSearchOperation = new CancellableOperation();

        try {
          const results = await memoryService.searchMemories({
            query: value.trim(),
            pageSize: config.search.pageSize,
            threshold: config.search.threshold,
            signal: currentSearchOperation.signal
          });

          // Check if this search was cancelled
          if (currentSearchOperation.isAborted) {
            return;
          }

          const items: vscode.QuickPickItem[] = [backItem];

          if (results.length === 0) {
            items.push({
              label: '$(search) No memories found',
              description: `No results for "${value.trim()}"`,
              detail: 'Try different keywords'
            });
          } else {
            // Show pagination info if there are many results
            const totalResults = results.length;
            const displayedResults = results.slice(0, config.search.pageSize);

            if (totalResults > config.search.pageSize) {
              items.push({
                label: `$(info) Showing ${displayedResults.length} of ${totalResults} results`,
                description: 'Refine your search for better results',
                detail: ''
              });
            }

            items.push(...displayedResults.map(result => ({
              label: `$(note) ${result.memory.title}`,
              description: result.memory.category || 'Uncategorized',
              detail: `${result.memory.content.substring(0, 100)}... (${Math.round(result.score * 100)}% match)`,
              memory: result.memory // Store memory data for selection
            } as vscode.QuickPickItem & { memory: Memory })));
          }

          quickPick.items = items;
        } catch (error) {
          // Don't show error if operation was just cancelled
          if (error instanceof Error && error.message.includes('cancelled')) {
            return;
          }

          const serviceError = ErrorUtils.createServiceError('MemoryService', 'searchMemories', error);
          ErrorHandler.handleError(serviceError, ErrorHandler.createContext('search_memories', { query: value.trim() }));
          quickPick.items = [
            backItem,
            {
              label: '$(error) Search failed',
              description: 'An error occurred while searching',
              detail: 'Please try again'
            }
          ];
        }
      }, config.search.debounceMs);
    });

    // Handle item selection
    quickPick.onDidAccept(async () => {
      const selected = quickPick.selectedItems[0] as vscode.QuickPickItem & { memory?: Memory };

      if (selected.label.includes('Back to memories')) {
        // Return to normal tree view
        memoryTreeProvider.clearSearch();
      } else if (selected.memory) {
        // Open memory in editor
        const memoryEditor = new MemoryEditor(extensionUri, memoryService);
        await memoryEditor.show({
          mode: 'edit',
          memory: selected.memory
        });
      }

      quickPick.dispose();
    });

    // Handle cancellation
    quickPick.onDidHide(() => {
      // Cancel any ongoing search operation
      if (currentSearchOperation) {
        currentSearchOperation.cancel();
      }
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      quickPick.dispose();
    });

    quickPick.show();
  } catch (error) {
    const serviceError = ErrorUtils.createServiceError('MemoryService', 'searchMemories', error);
    ErrorHandler.handleError(serviceError, ErrorHandler.createContext('open_memory_search'));
  }
}

/**
 * Clear search results
 */
export function clearSearch(memoryTreeProvider: MemoryTreeProvider): void {
  memoryTreeProvider.clearSearch();
  vscode.window.showInformationMessage('Search cleared.');
}


