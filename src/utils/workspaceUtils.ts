import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Utility functions for workspace operations
 */
export class WorkspaceUtils {
  /**
   * Get the current workspace folder path
   * @returns The workspace folder path or null if no workspace is open
   */
  static getCurrentWorkspacePath(): string | null {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return null;
    }
    return workspaceFolders[0].uri.fsPath;
  }

  /**
   * Get the .agentic-tools-mcp directory path for the current workspace
   * @returns The .agentic-tools-mcp directory path or null if no workspace
   */
  static getAgenticToolsPath(): string | null {
    const workspacePath = this.getCurrentWorkspacePath();
    if (!workspacePath) {
      return null;
    }
    return path.join(workspacePath, '.agentic-tools-mcp');
  }

  /**
   * Get the tasks directory path
   * @returns The tasks directory path or null if no workspace
   */
  static getTasksPath(): string | null {
    const agenticPath = this.getAgenticToolsPath();
    if (!agenticPath) {
      return null;
    }
    return path.join(agenticPath, 'tasks');
  }

  /**
   * Get the memories directory path
   * @returns The memories directory path or null if no workspace
   */
  static getMemoriesPath(): string | null {
    const agenticPath = this.getAgenticToolsPath();
    if (!agenticPath) {
      return null;
    }
    return path.join(agenticPath, 'memories');
  }

  /**
   * Get the tasks.json file path
   * @returns The tasks.json file path or null if no workspace
   */
  static getTasksFilePath(): string | null {
    const tasksPath = this.getTasksPath();
    if (!tasksPath) {
      return null;
    }
    return path.join(tasksPath, 'tasks.json');
  }

  /**
   * Ensure the .agentic-tools-mcp directory structure exists
   * @returns Promise that resolves when structure is created
   */
  static async ensureAgenticToolsStructure(): Promise<void> {
    const workspacePath = this.getCurrentWorkspacePath();
    if (!workspacePath) {
      throw new Error('No workspace folder is open');
    }

    const agenticPath = path.join(workspacePath, '.agentic-tools-mcp');
    const tasksPath = path.join(agenticPath, 'tasks');
    const memoriesPath = path.join(agenticPath, 'memories');

    // Create directories
    await fs.mkdir(agenticPath, { recursive: true });
    await fs.mkdir(tasksPath, { recursive: true });
    await fs.mkdir(memoriesPath, { recursive: true });

    // Create tasks.json if it doesn't exist
    const tasksFilePath = path.join(tasksPath, 'tasks.json');
    try {
      await fs.access(tasksFilePath);
    } catch {
      // File doesn't exist, create it with empty structure
      const emptyData = {
        projects: [],
        tasks: [],
        subtasks: []
      };
      await fs.writeFile(tasksFilePath, JSON.stringify(emptyData, null, 2));
    }
  }

  /**
   * Check if the current workspace has the .agentic-tools-mcp structure
   * @returns Promise that resolves to true if structure exists
   */
  static async hasAgenticToolsStructure(): Promise<boolean> {
    const agenticPath = this.getAgenticToolsPath();
    const tasksFilePath = this.getTasksFilePath();
    
    if (!agenticPath || !tasksFilePath) {
      return false;
    }

    try {
      await fs.access(agenticPath);
      await fs.access(tasksFilePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate that the workspace has proper permissions
   * @returns Promise that resolves to true if permissions are valid
   */
  static async validatePermissions(): Promise<boolean> {
    const workspacePath = this.getCurrentWorkspacePath();
    if (!workspacePath) {
      return false;
    }

    try {
      // Test read access
      await fs.access(workspacePath, fs.constants.R_OK);
      // Test write access
      await fs.access(workspacePath, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Show an error message when no workspace is available
   */
  static showNoWorkspaceError(): void {
    vscode.window.showErrorMessage(
      'Agentic Tools requires an open workspace folder. Please open a folder to use this extension.',
      'Open Folder'
    ).then(selection => {
      if (selection === 'Open Folder') {
        vscode.commands.executeCommand('vscode.openFolder');
      }
    });
  }

  /**
   * Show an error message when permissions are invalid
   */
  static showPermissionError(): void {
    vscode.window.showErrorMessage(
      'Agentic Tools cannot access the workspace folder. Please check folder permissions.'
    );
  }
}
