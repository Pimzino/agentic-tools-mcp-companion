/**
 * Memory metadata structure for type-safe metadata handling
 */
export interface MemoryMetadata {
  /** Source of the memory (e.g., 'user_input', 'conversation', 'file') */
  source?: string;
  /** Priority level (1-5, where 5 is highest) */
  priority?: number;
  /** Tags for categorization */
  tags?: string[];
  /** Related memory IDs */
  relatedMemories?: string[];
  /** Custom key-value pairs for extensibility */
  [key: string]: string | number | boolean | string[] | undefined;
}

/**
 * Memory data model for the agent memories system
 * This interface matches exactly with the MCP server implementation
 */
export interface Memory {
  /** Unique identifier for the memory */
  id: string;
  /** Short title for file naming (max 50 characters) */
  title: string;
  /** Detailed memory content/text (no limit) */
  content: string;
  /** Structured metadata object for additional information */
  metadata: MemoryMetadata;
  /** Timestamp when the memory was created */
  createdAt: string;
  /** Timestamp when the memory was last updated */
  updatedAt: string;
  /** Optional categorization of the memory */
  category?: string;
}

/**
 * Input data for creating a new memory
 */
export interface CreateMemoryInput {
  /** Short title for file naming (max 50 characters) */
  title: string;
  /** Detailed memory content/text (no limit) */
  content: string;
  /** Structured metadata object for additional information */
  metadata?: MemoryMetadata;
  /** Optional categorization of the memory */
  category?: string;
}

/**
 * Input data for updating an existing memory
 */
export interface UpdateMemoryInput {
  /** Short title for file naming (max 50 characters) (optional) */
  title?: string;
  /** Detailed memory content/text (no limit) (optional) */
  content?: string;
  /** Structured metadata object for additional information (optional) */
  metadata?: MemoryMetadata;
  /** Optional categorization of the memory */
  category?: string;
}

/**
 * Input data for searching memories
 */
export interface SearchMemoryInput {
  /** Search query text */
  query: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Minimum relevance threshold (0-1) */
  threshold?: number;
  /** Optional category filter */
  category?: string;
}

/**
 * Search result with relevance score
 */
export interface MemorySearchResult {
  /** The memory object */
  memory: Memory;
  /** Relevance score (0-1, higher is more relevant) */
  score: number;
}

/**
 * Configuration options for the memory system
 */
export interface MemoryConfig {
  /** Default relevance threshold for searches */
  defaultThreshold: number;
  /** Default maximum results for searches */
  defaultLimit: number;
}

/**
 * Default configuration for the memory system
 */
export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  defaultThreshold: 0.3, // Minimum relevance score for text-based search
  defaultLimit: 10,
};

/**
 * Constants for memory validation
 */
export const MEMORY_CONSTANTS = {
  /** Maximum length for memory titles */
  MAX_TITLE_LENGTH: 50,
  /** Default category for uncategorized memories */
  DEFAULT_CATEGORY: 'general',
} as const;
