/**
 * Memory data model for the agent memories system
 * This interface matches exactly with the MCP server implementation
 */
export interface Memory {
  /** Unique identifier for the memory */
  id: string;
  /** The actual memory content/text */
  content: string;
  /** Vector representation of the content (optional, auto-generated if not provided) */
  embedding?: number[];
  /** Flexible metadata object for additional information */
  metadata: Record<string, any>;
  /** Timestamp when the memory was created */
  createdAt: string;
  /** Timestamp when the memory was last updated */
  updatedAt: string;
  /** Optional agent identifier for multi-agent scenarios */
  agentId?: string;
  /** Optional categorization of the memory */
  category?: string;
  /** Optional importance score (1-10) */
  importance?: number;
}

/**
 * Input data for creating a new memory
 */
export interface CreateMemoryInput {
  /** The actual memory content/text */
  content: string;
  /** Flexible metadata object for additional information */
  metadata?: Record<string, any>;
  /** Optional agent identifier for multi-agent scenarios */
  agentId?: string;
  /** Optional categorization of the memory */
  category?: string;
  /** Optional importance score (1-10) */
  importance?: number;
  /** Optional pre-computed embedding vector */
  embedding?: number[];
}

/**
 * Input data for updating an existing memory
 */
export interface UpdateMemoryInput {
  /** The actual memory content/text (optional) */
  content?: string;
  /** Flexible metadata object for additional information (optional) */
  metadata?: Record<string, any>;
  /** Optional categorization of the memory */
  category?: string;
  /** Optional importance score (1-10) */
  importance?: number;
}

/**
 * Input data for searching memories
 */
export interface SearchMemoryInput {
  /** Search query (text or vector) */
  query: string | number[];
  /** Maximum number of results to return */
  limit?: number;
  /** Minimum similarity threshold (0-1) */
  threshold?: number;
  /** Optional agent identifier filter */
  agentId?: string;
  /** Optional category filter */
  category?: string;
  /** Optional importance filter (minimum importance) */
  minImportance?: number;
}

/**
 * Search result with similarity score
 */
export interface MemorySearchResult {
  /** The memory object */
  memory: Memory;
  /** Similarity score (0-1, higher is more similar) */
  score: number;
  /** Distance metric from the query vector */
  distance: number;
}

/**
 * Configuration options for the memory system
 */
export interface MemoryConfig {
  /** Embedding vector dimension */
  embeddingDimension: number;
  /** Default similarity threshold for searches */
  defaultThreshold: number;
  /** Default maximum results for searches */
  defaultLimit: number;
  /** Whether to auto-generate embeddings */
  autoEmbedding: boolean;
}

/**
 * Default configuration for the memory system
 */
export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  embeddingDimension: 200, // Optimized for TF-IDF + SVD
  defaultThreshold: 0.3, // Realistic for TF-IDF + SVD embeddings (0.2-0.5 range recommended)
  defaultLimit: 10,
  autoEmbedding: true,
};
