import * as vscode from 'vscode';
import * as lancedb from '@lancedb/lancedb';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  Memory,
  CreateMemoryInput,
  UpdateMemoryInput,
  SearchMemoryInput,
  MemorySearchResult,
  MemoryConfig,
  DEFAULT_MEMORY_CONFIG
} from '../models/index';
import { WorkspaceUtils, FileUtils } from '../utils/index';
import { TfIdfSvdEmbeddingFunction } from '../utils/embeddingFunction';

/**
 * Service class for memory management operations
 * Handles all CRUD operations for memories with LanceDB integration
 */
export class MemoryService {
  private static instance: MemoryService;
  private onDataChangedEmitter = new vscode.EventEmitter<void>();
  private config: MemoryConfig;
  private db: lancedb.Connection | null = null;
  private table: lancedb.Table | null = null;
  private embeddingFunction: TfIdfSvdEmbeddingFunction;
  private corpusNeedsUpdate = true;
  private isInitialized = false;

  /**
   * Event fired when memory data changes
   */
  public readonly onDataChanged = this.onDataChangedEmitter.event;

  private constructor() {
    this.config = DEFAULT_MEMORY_CONFIG;
    this.embeddingFunction = new TfIdfSvdEmbeddingFunction(this.config.embeddingDimension);
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

      const workspacePath = WorkspaceUtils.getCurrentWorkspacePath();
      if (!workspacePath) {
        throw new Error('No workspace folder is open');
      }

      // Validate that working directory exists
      await fs.access(workspacePath);

      const storageDir = path.join(workspacePath, '.agentic-tools-mcp');
      const dbPath = path.join(storageDir, 'memories');

      // Ensure .agentic-tools-mcp directory exists
      await fs.mkdir(storageDir, { recursive: true });

      // Connect to LanceDB
      this.db = await lancedb.connect(dbPath);

      // Try to open existing table or create new one
      try {
        this.table = await this.db.openTable('agent_memories');
      } catch (error) {
        // Table doesn't exist, create it
        await this.createTable();
      }

      // Initialize embedding function with existing memories
      await this.updateEmbeddingCorpus();

      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize memory service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create the agent_memories table with proper schema
   */
  private async createTable(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Create table with initial empty data to establish schema
      // Note: LanceDB requires metadata to be a string, not an object
      // Note: LanceDB expects vector column to be named "vector" for search
      const initialData = [{
        id: 'temp-init-record',
        content: 'temporary initialization record',
        vector: new Array(this.config.embeddingDimension).fill(0.1), // Use non-zero values for better schema detection
        metadata: '{"temp": true}', // Store as JSON string
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        agentId: 'temp-agent',
        category: 'temp-category',
        importance: 1
      }];

      this.table = await this.db.createTable('agent_memories', initialData);

      // Delete the temporary record using consistent syntax
      await this.table.delete(`id = 'temp-init-record'`);

      // Verify table is properly initialized
      await this.table.query().limit(0).toArray();

    } catch (error) {
      console.error('❌ Failed to create LanceDB table:', error);
      throw new Error(`Failed to create agent_memories table: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ensure table is available
   */
  private ensureTable(): lancedb.Table {
    if (!this.table) {
      throw new Error('Storage not initialized. Call initialize() first.');
    }
    return this.table;
  }

  /**
   * Update the embedding corpus with all existing memories
   */
  private async updateEmbeddingCorpus(): Promise<void> {
    if (!this.corpusNeedsUpdate || !this.table) {
      return;
    }

    try {
      const memories = await this.table.query().toArray();
      const documents = memories.map((row: any) => row.content);

      if (documents.length > 0) {
        await this.embeddingFunction.initializeCorpus(documents);
      }

      this.corpusNeedsUpdate = false;
    } catch (error) {
      console.warn('Failed to update embedding corpus:', error);
    }
  }

  /**
   * Generate embedding for content
   */
  private async generateEmbedding(content: string): Promise<number[]> {
    await this.updateEmbeddingCorpus();
    return await this.embeddingFunction.embed(content);
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
    const table = this.ensureTable();

    const now = FileUtils.getCurrentTimestamp();
    const memory: Memory = {
      id: FileUtils.generateId(),
      content: input.content,
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now,
      agentId: input.agentId,
      category: input.category,
      importance: input.importance,
      embedding: input.embedding
    };

    // Generate embedding if not provided
    if (!memory.embedding && this.config.autoEmbedding) {
      memory.embedding = await this.generateEmbedding(memory.content);
    }

    // Prepare data for LanceDB
    const data = [{
      id: memory.id,
      content: memory.content,
      vector: memory.embedding || new Array(this.config.embeddingDimension).fill(0), // Use 'vector' column name
      metadata: JSON.stringify(memory.metadata),
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
      agentId: memory.agentId || '',
      category: memory.category || '',
      importance: memory.importance || 1,
    }];

    await table.add(data);

    // Mark corpus for update since we added new content
    this.corpusNeedsUpdate = true;

    this.onDataChangedEmitter.fire();
    return memory;
  }

  /**
   * Search memories by semantic similarity
   */
  async searchMemories(input: SearchMemoryInput): Promise<MemorySearchResult[]> {
    await this.initialize();
    const table = this.ensureTable();

    let queryVector: number[];

    if (typeof input.query === 'string') {
      // Generate embedding for text query
      queryVector = await this.generateEmbedding(input.query);
    } else {
      // Use provided vector
      queryVector = input.query;
    }

    // Use search() method which expects the vector column to be named "vector"
    let query = table.search(queryVector)
      .limit(input.limit || this.config.defaultLimit);

    // Apply filters (search() method - try backticks for agentId)
    const filters: string[] = [];
    if (input.agentId) {
      filters.push(`\`agentId\` = '${input.agentId}'`);
    }
    if (input.category) {
      filters.push(`category = '${input.category}'`);
    }
    if (input.minImportance) {
      filters.push(`importance >= ${input.minImportance}`);
    }

    if (filters.length > 0) {
      query = query.where(filters.join(' AND '));
    }

    const results = await query.toArray();

    return results.map((row: any) => {
      const memory: Memory = {
        id: row.id,
        content: row.content,
        embedding: row.vector,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        agentId: row.agentId || undefined,
        category: row.category || undefined,
        importance: row.importance || undefined,
      };

      return {
        memory,
        score: row._distance ? 1 - row._distance : 0, // Convert distance to similarity score
        distance: row._distance || 0
      };
    }).filter(result => {
      // Apply threshold filter
      const threshold = input.threshold || this.config.defaultThreshold;
      return result.score >= threshold;
    });
  }

  /**
   * Get all memories with optional filtering
   */
  async getMemories(agentId?: string, category?: string, limit?: number): Promise<Memory[]> {
    await this.initialize();
    const table = this.ensureTable();

    let query = table.query();

    // Apply filters
    const filters: string[] = [];
    if (agentId) {
      filters.push(`\`agentId\` = '${agentId}'`);
    }
    if (category) {
      filters.push(`category = '${category}'`);
    }

    if (filters.length > 0) {
      query = query.where(filters.join(' AND '));
    }

    if (limit) {
      query = query.limit(limit);
    }

    const results = await query.toArray();

    return results.map((row: any) => ({
      id: row.id,
      content: row.content,
      embedding: row.vector,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      agentId: row.agentId || undefined,
      category: row.category || undefined,
      importance: row.importance || undefined,
    }));
  }

  /**
   * Get a specific memory by ID
   */
  async getMemory(id: string): Promise<Memory | null> {
    await this.initialize();
    const table = this.ensureTable();

    try {
      const results = await table.query().where(`id = '${id}'`).toArray();

      if (results.length === 0) {
        return null;
      }

      const row = results[0];
      return {
        id: row.id,
        content: row.content,
        embedding: row.vector,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        agentId: row.agentId || undefined,
        category: row.category || undefined,
        importance: row.importance || undefined,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Update an existing memory
   */
  async updateMemory(id: string, updates: UpdateMemoryInput): Promise<Memory | null> {
    const existingMemory = await this.getMemory(id);
    if (!existingMemory) {
      return null;
    }

    // Merge updates
    const updatedMemory: Memory = {
      ...existingMemory,
      ...updates,
      id: existingMemory.id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    // Regenerate embedding if content changed
    if (updates.content && this.config.autoEmbedding) {
      updatedMemory.embedding = await this.generateEmbedding(updatedMemory.content);
    }

    // Delete old record and insert updated one
    await this.deleteMemory(id);
    await this.createMemory(updatedMemory);

    // Mark corpus for update since content may have changed
    this.corpusNeedsUpdate = true;

    return updatedMemory;
  }

  /**
   * Delete a memory
   */
  async deleteMemory(id: string): Promise<boolean> {
    await this.initialize();
    const table = this.ensureTable();

    try {
      await table.delete(`id = '${id}'`);
      // Mark corpus for update since we removed content
      this.corpusNeedsUpdate = true;
      this.onDataChangedEmitter.fire();
      return true;
    } catch (error) {
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

    // Count by agent and category
    memories.forEach(memory => {
      if (memory.agentId) {
        stats.memoriesByAgent[memory.agentId] = (stats.memoriesByAgent[memory.agentId] || 0) + 1;
      }
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
