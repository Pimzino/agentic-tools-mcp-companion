import * as vscode from 'vscode';
import { MemoryTreeItem, MemoryTreeProvider } from '../providers/memoryTreeProvider';
import { MemoryService } from '../services/memoryService';
import { CreateMemoryInput, UpdateMemoryInput, Memory, MEMORY_CONSTANTS } from '../models/index';
import { MemoryEditor, MemoryEditorData } from '../editors/memoryEditor';



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
    vscode.window.showErrorMessage(`Failed to open memory editor: ${error}`);
  }
}

/**
 * Edit a memory using the rich editor interface
 */
export async function editMemory(memoryService: MemoryService, item: MemoryTreeItem, extensionUri: vscode.Uri): Promise<void> {
  if (item.type !== 'memory') return;

  try {
    const memory = item.data as Memory;
    const memoryEditor = new MemoryEditor(extensionUri, memoryService);

    const editorData: MemoryEditorData = {
      mode: 'edit',
      memory: memory
    };

    await memoryEditor.show(editorData);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open memory editor: ${error}`);
  }
}

/**
 * Delete a memory
 */
export async function deleteMemory(memoryService: MemoryService, item: MemoryTreeItem): Promise<void> {
  if (item.type !== 'memory') return;

  try {
    const memory = item.data as Memory;
    const preview = memory.title;

    const confirmation = await vscode.window.showWarningMessage(
      `Are you sure you want to delete this memory?\n\n"${preview}"`,
      { modal: true },
      'Delete'
    );

    if (confirmation !== 'Delete') return;

    await memoryService.deleteMemory(memory.id);
    vscode.window.showInformationMessage('Memory deleted successfully!');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to delete memory: ${error}`);
  }
}

/**
 * Search memories with real-time QuickPick interface
 */
export async function searchMemories(memoryService: MemoryService, memoryTreeProvider: MemoryTreeProvider, extensionUri: vscode.Uri): Promise<void> {
  try {
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

    // Handle real-time search as user types
    quickPick.onDidChangeValue(async (value) => {
      // Clear previous timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Debounce search to avoid too many requests
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

        try {
          const results = await memoryService.searchMemories({
            query: value.trim(),
            limit: 50
          });

          const items: vscode.QuickPickItem[] = [backItem];

          if (results.length === 0) {
            items.push({
              label: '$(search) No memories found',
              description: `No results for "${value.trim()}"`,
              detail: 'Try different keywords'
            });
          } else {
            items.push(...results.map(result => ({
              label: `$(note) ${result.memory.title}`,
              description: result.memory.category || 'Uncategorized',
              detail: `${result.memory.content.substring(0, 100)}... (${Math.round(result.score * 100)}% match)`,
              memory: result.memory // Store memory data for selection
            } as vscode.QuickPickItem & { memory: Memory })));
          }

          quickPick.items = items;
        } catch (error) {
          quickPick.items = [
            backItem,
            {
              label: '$(error) Search failed',
              description: `Error: ${error}`,
              detail: 'Please try again'
            }
          ];
        }
      }, 300); // 300ms debounce
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
      quickPick.dispose();
    });

    quickPick.show();
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open memory search: ${error}`);
  }
}

/**
 * Clear search results
 */
export function clearSearch(memoryTreeProvider: MemoryTreeProvider): void {
  memoryTreeProvider.clearSearch();
  vscode.window.showInformationMessage('Search cleared.');
}


