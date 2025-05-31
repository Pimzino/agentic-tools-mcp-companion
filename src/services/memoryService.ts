import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  Memory,
  CreateMemoryInput,
  UpdateMemoryInput,
  SearchMemoryInput,
  MemorySearchResult,
  MemoryConfig,
  DEFAULT_MEMORY_CONFIG,
  MEMORY_CONSTANTS
} from '../models/index';
import { WorkspaceUtils, FileUtils } from '../utils/index';
import { ErrorUtils, ServiceError, FileOperationError, WorkspaceError } from '../utils/errorHandler';
import { ConfigUtils, CancellableOperation, PaginatedSearchResult, debounce } from '../utils/configUtils';

/**
 * JSON file structure for memory storage
 */
interface MemoryJsonFile {
  id: string;
  title: string;
  details: string;
  category: string;
  dateCreated: string;
  dateUpdated: string;
}

/**
 * Extended search input with pagination support
 */
interface ExtendedSearchMemoryInput extends SearchMemoryInput {
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

/**
 * Paginated memory search result
 */
interface PaginatedMemorySearchResult extends PaginatedSearchResult<MemorySearchResult> {}

/**
 * Service class for memory management operations
 * Handles all CRUD operations for memories with JSON file storage
 */
export class MemoryService {
  private static instance: MemoryService;
  private onDataChangedEmitter = new vscode.EventEmitter<void>();
  private debouncedDataChanged: () => void;
  private config: MemoryConfig;
  private workingDirectory: string | null = null;
  private storageDir: string | null = null;
  private memoriesDir: string | null = null;
  private isInitialized = false;

  /**
   * Event fired when memory data changes
   */
  public readonly onDataChanged = this.onDataChangedEmitter.event;

  private constructor() {
    this.config = DEFAULT_MEMORY_CONFIG;
    const config = ConfigUtils.getConfig();
    this.debouncedDataChanged = debounce(() => {
      this.onDataChangedEmitter.fire();
    }, config.fileWatching.debounceMs);
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  /**
   * Initialize the memory service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await WorkspaceUtils.ensureAgenticToolsStructure();

      this.workingDirectory = WorkspaceUtils.getCurrentWorkspacePath();
      if (!this.workingDirectory) {
        throw new Error('No workspace folder is open');
      }

      // Validate that working directory exists
      await fs.access(this.workingDirectory);

      this.storageDir = path.join(this.workingDirectory, '.agentic-tools-mcp');
      this.memoriesDir = path.join(this.storageDir, 'memories');

      // Ensure .agentic-tools-mcp directory exists
      await fs.mkdir(this.storageDir, { recursive: true });

      // Ensure memories directory exists
      await fs.mkdir(this.memoriesDir, { recursive: true });

      this.isInitialized = true;
    } catch (error) {
      throw ErrorUtils.createServiceError('MemoryService', 'initialize', error);
    }
  }

  /**
   * Ensure storage is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.memoriesDir) {
      throw new Error('Storage not initialized. Call initialize() first.');
    }
  }

  /**
   * Sanitize title for use as filename
   */
  private sanitizeTitle(title: string): string {
    return title
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid filename characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .toLowerCase();
  }

  /**
   * Get file path for a memory
   */
  private getMemoryFilePath(memory: Memory): string {
    this.ensureInitialized();
    const category = memory.category || MEMORY_CONSTANTS.DEFAULT_CATEGORY;
    const sanitizedTitle = this.sanitizeTitle(memory.title);
    return path.join(this.memoriesDir!, category, `${sanitizedTitle}.json`);
  }

  /**
   * Ensure category directory exists
   */
  private async ensureCategoryDirectory(category: string): Promise<void> {
    this.ensureInitialized();
    const categoryDir = path.join(this.memoriesDir!, category);
    await fs.mkdir(categoryDir, { recursive: true });
  }

  /**
   * Resolve file name conflicts by appending numbers
   */
  private async resolveFileNameConflict(filePath: string): Promise<string> {
    let counter = 1;
    let resolvedPath = filePath;

    while (true) {
      try {
        await fs.access(resolvedPath);
        // File exists, try next number
        const ext = path.extname(filePath);
        const base = filePath.slice(0, -ext.length);
        resolvedPath = `${base}_${counter}${ext}`;
        counter++;
      } catch {
        // File doesn't exist, we can use this path
        break;
      }
    }

    return resolvedPath;
  }

  /**
   * Find memory file by ID across all categories
   */
  private async findMemoryFileById(id: string): Promise<string | null> {
    this.ensureInitialized();

    try {
      const categories = await fs.readdir(this.memoriesDir!, { withFileTypes: true });

      for (const category of categories) {
        if (category.isDirectory()) {
          const categoryPath = path.join(this.memoriesDir!, category.name);
          const files = await fs.readdir(categoryPath);

          for (const file of files) {
            if (file.endsWith('.json')) {
              const filePath = path.join(categoryPath, file);
              try {
                const content = await fs.readFile(filePath, 'utf-8');
                const jsonMemory = JSON.parse(content);
                if (jsonMemory.id === id) {
                  return filePath;
                }
              } catch {
                // Skip invalid JSON files
                continue;
              }
            }
          }
        }
      }
    } catch {
      // Directory doesn't exist or other error
    }

    return null;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.onDataChangedEmitter.dispose();
  }

  /**
   * Create a new memory
   */
  async createMemory(input: CreateMemoryInput): Promise<Memory> {
    await this.initialize();

    // Validate title length
    if (input.title.length > MEMORY_CONSTANTS.MAX_TITLE_LENGTH) {
      throw new Error(`Memory title must be ${MEMORY_CONSTANTS.MAX_TITLE_LENGTH} characters or less`);
    }

    const now = FileUtils.getCurrentTimestamp();
    const memory: Memory = {
      id: FileUtils.generateId(),
      title: input.title.trim(),
      content: input.content,
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now,
      category: input.category
    };

    // Ensure category directory exists
    await this.ensureCategoryDirectory(memory.category || MEMORY_CONSTANTS.DEFAULT_CATEGORY);

    // Create JSON memory object for file storage
    const jsonMemory: MemoryJsonFile = {
      id: memory.id,
      title: memory.title,
      details: memory.content,
      category: memory.category || MEMORY_CONSTANTS.DEFAULT_CATEGORY,
      dateCreated: memory.createdAt,
      dateUpdated: memory.updatedAt
    };

    // Get file path and handle conflicts
    let filePath = this.getMemoryFilePath(memory);
    filePath = await this.resolveFileNameConflict(filePath);

    // Write to file
    await fs.writeFile(filePath, JSON.stringify(jsonMemory, null, 2), 'utf-8');

    this.debouncedDataChanged();
    return memory;
  }

  /**
   * Search memories using text-based matching with performance optimizations
   */
  async searchMemories(input: ExtendedSearchMemoryInput): Promise<MemorySearchResult[]> {
    await this.initialize();

    const config = ConfigUtils.getConfig();
    const allMemories = await this.getMemories(undefined, input.category);
    const query = input.query.toLowerCase();
    const results: MemorySearchResult[] = [];
    const threshold = input.threshold ?? config.search.threshold;
    const maxResults = input.limit ?? config.search.maxResults;

    // Check for cancellation
    if (input.signal?.aborted) {
      throw new Error('Search operation was cancelled');
    }

    for (const memory of allMemories) {
      // Check for cancellation during processing
      if (input.signal?.aborted) {
        throw new Error('Search operation was cancelled');
      }

      const score = this.calculateRelevanceScore(memory, query, config.performance);

      // Early termination for very low scores
      if (config.performance.enableEarlyTermination && score < config.performance.lowScoreThreshold) {
        continue;
      }

      if (score >= threshold) {
        results.push({
          memory,
          score
        });

        // Stop if we've reached max results to prevent excessive processing
        if (results.length >= maxResults) {
          break;
        }
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Apply final limit
    return results.slice(0, maxResults);
  }

  /**
   * Search memories with pagination support
   */
  async searchMemoriesPaginated(input: ExtendedSearchMemoryInput): Promise<PaginatedMemorySearchResult> {
    const config = ConfigUtils.getConfig();
    const pageSize = input.pageSize ?? config.search.pageSize;
    const page = input.page ?? 1;

    // Get all search results first
    const allResults = await this.searchMemories(input);

    // Apply pagination
    return ConfigUtils.paginateResults(allResults, page, pageSize);
  }

  /**
   * Calculate relevance score for text-based search with performance optimizations
   */
  private calculateRelevanceScore(
    memory: Memory,
    query: string,
    performanceConfig?: { enableEarlyTermination: boolean; lowScoreThreshold: number }
  ): number {
    const title = memory.title.toLowerCase();
    const content = memory.content.toLowerCase();
    let score = 0;

    // Title matches (higher weight) - prioritize exact matches
    if (title.includes(query)) {
      if (title === query) {
        score += 1.0; // Exact match
      } else if (title.startsWith(query)) {
        score += 0.8; // Title starts with query
      } else if (title.endsWith(query)) {
        score += 0.6; // Title ends with query
      } else {
        score += 0.4; // Title contains query
      }
    }

    // Early termination if enabled and score is already very low
    if (performanceConfig?.enableEarlyTermination && score < performanceConfig.lowScoreThreshold) {
      return score;
    }

    // Content matches (lower weight) - only process if we haven't found a good title match
    if (score < 0.8 && content.includes(query)) {
      const contentWords = content.split(/\s+/);
      const queryWords = query.split(/\s+/);

      // Optimize by checking word boundaries for better matching
      let wordMatches = 0;
      for (const queryWord of queryWords) {
        if (content.includes(queryWord)) {
          wordMatches++;
        }
      }

      if (wordMatches > 0) {
        const matchRatio = wordMatches / queryWords.length;
        score += matchRatio * 0.3;
      }
    }

    // Category bonus (small boost) - only if we haven't already scored high
    if (score < 0.9 && memory.category && memory.category.toLowerCase().includes(query)) {
      score += 0.1;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Get all memories with optional filtering
   */
  async getMemories(_agentId?: string, category?: string, limit?: number): Promise<Memory[]> {
    await this.initialize();
    this.ensureInitialized();

    const memories: Memory[] = [];

    try {
      // If category is specified, only search that category
      const categoriesToSearch = category ? [category] : await this.getAllCategories();

      for (const cat of categoriesToSearch) {
        const categoryPath = path.join(this.memoriesDir!, cat);

        try {
          const files = await fs.readdir(categoryPath);

          for (const file of files) {
            if (file.endsWith('.json')) {
              const filePath = path.join(categoryPath, file);
              try {
                const content = await fs.readFile(filePath, 'utf-8');
                const jsonMemory: MemoryJsonFile = JSON.parse(content);

                // Convert to Memory interface
                const memory: Memory = {
                  id: jsonMemory.id,
                  title: jsonMemory.title,
                  content: jsonMemory.details,
                  metadata: {},
                  createdAt: jsonMemory.dateCreated,
                  updatedAt: jsonMemory.dateUpdated,
                  category: jsonMemory.category === MEMORY_CONSTANTS.DEFAULT_CATEGORY ? undefined : jsonMemory.category
                };

                memories.push(memory);
              } catch {
                // Skip invalid JSON files
                continue;
              }
            }
          }
        } catch {
          // Category directory doesn't exist, skip
          continue;
        }
      }
    } catch {
      // Memories directory doesn't exist
    }

    // Apply limit if specified
    if (limit && limit > 0) {
      return memories.slice(0, limit);
    }

    return memories;
  }

  /**
   * Get all category directories
   */
  private async getAllCategories(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const entries = await fs.readdir(this.memoriesDir!, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch {
      return [MEMORY_CONSTANTS.DEFAULT_CATEGORY];
    }
  }

  /**
   * Get a specific memory by ID
   */
  async getMemory(id: string): Promise<Memory | null> {
    await this.initialize();

    const filePath = await this.findMemoryFileById(id);
    if (!filePath) {
      return null;
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const jsonMemory: MemoryJsonFile = JSON.parse(content);

      // Convert to Memory interface
      return {
        id: jsonMemory.id,
        title: jsonMemory.title,
        content: jsonMemory.details,
        metadata: {},
        createdAt: jsonMemory.dateCreated,
        updatedAt: jsonMemory.dateUpdated,
        category: jsonMemory.category === MEMORY_CONSTANTS.DEFAULT_CATEGORY ? undefined : jsonMemory.category
      };
    } catch (error) {
      const serviceError = ErrorUtils.createServiceError('MemoryService', 'getMemory', error);
      console.error('MemoryService.getMemory: Failed to read memory file:', serviceError.message, { memoryId: id, filePath });
      return null;
    }
  }

  /**
   * Update an existing memory
   */
  async updateMemory(id: string, updates: UpdateMemoryInput): Promise<Memory | null> {
    const filePath = await this.findMemoryFileById(id);
    if (!filePath) {
      return null;
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const jsonMemory: MemoryJsonFile = JSON.parse(content);

      // Convert to Memory interface for merging
      const existingMemory: Memory = {
        id: jsonMemory.id,
        title: jsonMemory.title,
        content: jsonMemory.details,
        metadata: {},
        createdAt: jsonMemory.dateCreated,
        updatedAt: jsonMemory.dateUpdated,
        category: jsonMemory.category === MEMORY_CONSTANTS.DEFAULT_CATEGORY ? undefined : jsonMemory.category
      };

      // Validate title length if being updated
      if (updates.title && updates.title.length > MEMORY_CONSTANTS.MAX_TITLE_LENGTH) {
        throw new Error(`Memory title must be ${MEMORY_CONSTANTS.MAX_TITLE_LENGTH} characters or less`);
      }

      // Merge updates
      const updatedMemory: Memory = {
        ...existingMemory,
        ...updates,
        id: existingMemory.id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
      };

      // If category changed, we need to move the file
      if (updates.category !== undefined && updates.category !== existingMemory.category) {
        // Delete old file
        await fs.unlink(filePath);

        // Create new file in new category
        await this.createMemory(updatedMemory);
      } else {
        // Update existing file
        const updatedJsonMemory: MemoryJsonFile = {
          id: updatedMemory.id,
          title: updatedMemory.title,
          details: updatedMemory.content,
          category: updatedMemory.category || MEMORY_CONSTANTS.DEFAULT_CATEGORY,
          dateCreated: updatedMemory.createdAt,
          dateUpdated: updatedMemory.updatedAt
        };

        await fs.writeFile(filePath, JSON.stringify(updatedJsonMemory, null, 2), 'utf-8');
      }

      this.debouncedDataChanged();
      return updatedMemory;
    } catch (error) {
      const serviceError = ErrorUtils.createServiceError('MemoryService', 'updateMemory', error);
      console.error('MemoryService.updateMemory: Failed to update memory:', serviceError.message, { memoryId: id, updates });
      return null;
    }
  }

  /**
   * Delete a memory
   */
  async deleteMemory(id: string): Promise<boolean> {
    await this.initialize();

    const filePath = await this.findMemoryFileById(id);
    if (!filePath) {
      return false;
    }

    try {
      await fs.unlink(filePath);
      this.debouncedDataChanged();
      return true;
    } catch (error) {
      const serviceError = ErrorUtils.createServiceError('MemoryService', 'deleteMemory', error);
      console.error('MemoryService.deleteMemory: Failed to delete memory file:', serviceError.message, { memoryId: id, filePath });
      return false;
    }
  }

  /**
   * Get memory statistics
   */
  async getStatistics(): Promise<{
    totalMemories: number;
    memoriesByAgent: Record<string, number>;
    memoriesByCategory: Record<string, number>;
    oldestMemory?: string;
    newestMemory?: string;
  }> {
    await this.initialize();
    const memories = await this.getMemories();

    const stats = {
      totalMemories: memories.length,
      memoriesByAgent: {} as Record<string, number>,
      memoriesByCategory: {} as Record<string, number>,
      oldestMemory: undefined as string | undefined,
      newestMemory: undefined as string | undefined
    };

    if (memories.length === 0) {
      return stats;
    }

    // Count by category (agentId no longer supported)
    memories.forEach(memory => {
      if (memory.category) {
        stats.memoriesByCategory[memory.category] = (stats.memoriesByCategory[memory.category] || 0) + 1;
      }
    });

    // Find oldest and newest
    const sortedByDate = memories.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    stats.oldestMemory = sortedByDate[0].createdAt;
    stats.newestMemory = sortedByDate[sortedByDate.length - 1].createdAt;

    return stats;
  }

  /**
   * Validate workspace for memory operations
   */
  async validateWorkspace(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check if workspace is open
    if (!WorkspaceUtils.getCurrentWorkspacePath()) {
      errors.push('No workspace folder is open');
      return { isValid: false, errors };
    }

    // Check permissions
    if (!(await WorkspaceUtils.validatePermissions())) {
      errors.push('Insufficient permissions to access workspace folder');
    }

    // Check if .agentic-tools-mcp structure exists
    if (!(await WorkspaceUtils.hasAgenticToolsStructure())) {
      errors.push('.agentic-tools-mcp structure not found (will be created automatically)');
    }

    return { isValid: errors.length === 0, errors };
  }
}
