import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { StorageData } from '../models/index';
import { ErrorUtils, FileOperationError } from './errorHandler';

/**
 * Utility functions for file operations
 */
export class FileUtils {
  /**
   * Read and parse the tasks.json file
   * @param filePath - Path to the tasks.json file
   * @returns Promise that resolves to the parsed storage data
   */
  static async readTasksFile(filePath: string): Promise<StorageData> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content) as StorageData;

      // Validate structure
      if (!data.projects) {data.projects = [];}
      if (!data.tasks) {data.tasks = [];}
      if (!data.subtasks) {data.subtasks = [];}

      return data;
    } catch (error) {
      // If file doesn't exist or is corrupted, return empty structure
      // Log the error for debugging but don't throw - this is expected behavior
      if (error instanceof Error && !error.message.includes('ENOENT')) {
        // Only log non-file-not-found errors
        console.error('FileUtils.readTasksFile: Unexpected error reading file:', error.message);
      }
      return {
        projects: [],
        tasks: [],
        subtasks: []
      };
    }
  }

  /**
   * Write storage data to the tasks.json file atomically
   * @param filePath - Path to the tasks.json file
   * @param data - Storage data to write
   * @returns Promise that resolves when write is complete
   */
  static async writeTasksFile(filePath: string, data: StorageData): Promise<void> {
    const tempPath = `${filePath}.tmp`;

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Write to temporary file first
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');

      // Atomically move temp file to final location
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw ErrorUtils.createFileError('write', filePath, error);
    }
  }

  /**
   * Create a backup of the tasks.json file
   * @param filePath - Path to the tasks.json file
   * @returns Promise that resolves to the backup file path
   */
  static async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup.${timestamp}`;

    try {
      await fs.copyFile(filePath, backupPath);
      return backupPath;
    } catch (error) {
      throw ErrorUtils.createFileError('backup', filePath, error);
    }
  }

  /**
   * Validate that a file exists and is readable
   * @param filePath - Path to the file
   * @returns Promise that resolves to true if file is accessible
   */
  static async isFileAccessible(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file modification time
   * @param filePath - Path to the file
   * @returns Promise that resolves to the modification time or null if file doesn't exist
   */
  static async getModificationTime(filePath: string): Promise<Date | null> {
    try {
      const stats = await fs.stat(filePath);
      return stats.mtime;
    } catch {
      return null;
    }
  }

  /**
   * Watch a file for changes using VSCode's file system watcher
   * @param filePath - Path to the file to watch
   * @param callback - Callback function to call when file changes
   * @returns Disposable to stop watching
   */
  static watchFile(filePath: string, callback: () => void): { dispose: () => void } {
    // Use a simple polling approach for now
    let disposed = false;
    let lastModified: Date | null = null;

    const checkForChanges = async () => {
      if (disposed) {return;}

      try {
        const currentModified = await FileUtils.getModificationTime(filePath);
        if (currentModified && (!lastModified || currentModified > lastModified)) {
          lastModified = currentModified;
          if (lastModified) { // Only call callback after first check
            callback();
          }
        }
      } catch {
        // File doesn't exist or can't be accessed
      }

      if (!disposed) {
        setTimeout(checkForChanges, 1000);
      }
    };

    // Initialize last modified time
    FileUtils.getModificationTime(filePath).then(time => {
      lastModified = time;
      checkForChanges();
    });

    return {
      dispose: () => {
        disposed = true;
      }
    };
  }

  /**
   * Ensure a directory exists
   * @param dirPath - Path to the directory
   * @returns Promise that resolves when directory exists
   */
  static async ensureDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  /**
   * Generate a unique ID
   * @returns A unique identifier string
   */
  static generateId(): string {
    return randomUUID();
  }

  /**
   * Get current ISO timestamp
   * @returns Current timestamp in ISO format
   */
  static getCurrentTimestamp(): string {
    return new Date().toISOString();
  }
}
