import * as vscode from 'vscode';
import { MemoryTreeItem, MemoryTreeProvider } from '../providers/memoryTreeProvider';
import { MemoryService } from '../services/memoryService';
import { CreateMemoryInput, UpdateMemoryInput, Memory } from '../models/index';

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
 * Create a new memory
 */
export async function createMemory(memoryService: MemoryService): Promise<void> {
  try {
    const content = await vscode.window.showInputBox({
      prompt: 'Enter memory content',
      placeHolder: 'What would you like to remember?',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Memory content is required';
        }
        if (value.trim().length > 10000) {
          return 'Memory content must be 10,000 characters or less';
        }
        return null;
      }
    });

    if (!content) return;

    const category = await vscode.window.showInputBox({
      prompt: 'Enter category (optional)',
      placeHolder: 'e.g., user_preferences, project_context',
      validateInput: (value) => {
        if (value && value.length > 100) {
          return 'Category must be 100 characters or less';
        }
        return null;
      }
    });

    if (category === undefined) return;

    const agentId = await vscode.window.showInputBox({
      prompt: 'Enter agent ID (optional)',
      placeHolder: 'e.g., assistant-1',
      validateInput: (value) => {
        if (value && value.length > 100) {
          return 'Agent ID must be 100 characters or less';
        }
        return null;
      }
    });

    if (agentId === undefined) return;

    const importanceStr = await vscode.window.showInputBox({
      prompt: 'Enter importance (1-10, optional)',
      placeHolder: '5',
      validateInput: (value) => {
        if (value && value.trim().length > 0) {
          const num = parseInt(value.trim());
          if (isNaN(num) || num < 1 || num > 10) {
            return 'Importance must be a number between 1 and 10';
          }
        }
        return null;
      }
    });

    if (importanceStr === undefined) return;

    const importance = importanceStr && importanceStr.trim().length > 0 ?
      parseInt(importanceStr.trim()) : undefined;

    const input: CreateMemoryInput = {
      content: content.trim(),
      category: category?.trim() || undefined,
      agentId: agentId?.trim() || undefined,
      importance,
      metadata: {}
    };

    await memoryService.createMemory(input);
    vscode.window.showInformationMessage('Memory created successfully!');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create memory: ${error}`);
  }
}

/**
 * Edit a memory
 */
export async function editMemory(memoryService: MemoryService, item: MemoryTreeItem): Promise<void> {
  if (item.type !== 'memory') return;

  try {
    const memory = item.data as Memory;

    const content = await vscode.window.showInputBox({
      prompt: 'Enter memory content',
      value: memory.content,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Memory content is required';
        }
        if (value.trim().length > 10000) {
          return 'Memory content must be 10,000 characters or less';
        }
        return null;
      }
    });

    if (!content) return;

    const category = await vscode.window.showInputBox({
      prompt: 'Enter category (optional)',
      value: memory.category || '',
      validateInput: (value) => {
        if (value && value.length > 100) {
          return 'Category must be 100 characters or less';
        }
        return null;
      }
    });

    if (category === undefined) return;

    const importanceStr = await vscode.window.showInputBox({
      prompt: 'Enter importance (1-10, optional)',
      value: memory.importance?.toString() || '',
      validateInput: (value) => {
        if (value && value.trim().length > 0) {
          const num = parseInt(value.trim());
          if (isNaN(num) || num < 1 || num > 10) {
            return 'Importance must be a number between 1 and 10';
          }
        }
        return null;
      }
    });

    if (importanceStr === undefined) return;

    const importance = importanceStr && importanceStr.trim().length > 0 ?
      parseInt(importanceStr.trim()) : undefined;

    const updates: UpdateMemoryInput = {
      content: content.trim(),
      category: category?.trim() || undefined,
      importance
    };

    await memoryService.updateMemory(memory.id, updates);
    vscode.window.showInformationMessage('Memory updated successfully!');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to update memory: ${error}`);
  }
}

/**
 * Delete a memory
 */
export async function deleteMemory(memoryService: MemoryService, item: MemoryTreeItem): Promise<void> {
  if (item.type !== 'memory') return;

  try {
    const memory = item.data as Memory;
    const preview = memory.content.length > 100 ?
      memory.content.substring(0, 100) + '...' :
      memory.content;

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
