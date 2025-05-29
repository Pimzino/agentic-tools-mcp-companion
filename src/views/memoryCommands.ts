import * as vscode from 'vscode';
import { MemoryTreeItem, MemoryTreeProvider } from '../providers/memoryTreeProvider';
import { MemoryService } from '../services/memoryService';
import { CreateMemoryInput, UpdateMemoryInput, Memory, MEMORY_CONSTANTS } from '../models/index';
import { MemoryEditor, MemoryEditorData } from '../editors/memoryEditor';

/**
 * Search memories
 */
export async function searchMemories(memoryService: MemoryService, memoryTreeProvider: MemoryTreeProvider): Promise<void> {
  try {
    const query = await vscode.window.showInputBox({
      prompt: 'Enter search query',
      placeHolder: 'Search for memories...',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Search query is required';
        }
        if (value.trim().length > 500) {
          return 'Search query must be 500 characters or less';
        }
        return null;
      }
    });

    if (!query) return;

    const results = await memoryService.searchMemories({
      query: query.trim(),
      limit: 50
    });

    // Extract memories from search results
    const memories = results.map(result => result.memory);
    memoryTreeProvider.setSearchResults(memories);

    if (results.length === 0) {
      vscode.window.showInformationMessage('No memories found matching your search.');
    } else {
      vscode.window.showInformationMessage(`Found ${results.length} matching memories.`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to search memories: ${error}`);
  }
}

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
 * Clear search results
 */
export function clearSearch(memoryTreeProvider: MemoryTreeProvider): void {
  memoryTreeProvider.clearSearch();
  vscode.window.showInformationMessage('Search cleared.');
}


