import * as vscode from 'vscode';

/**
 * Configuration interface for the extension
 */
export interface ExtensionConfig {
  search: {
    pageSize: number;
    maxResults: number;
    debounceMs: number;
    threshold: number;
  };
  fileWatching: {
    debounceMs: number;
  };
  performance: {
    enableEarlyTermination: boolean;
    lowScoreThreshold: number;
  };
}

/**
 * Pagination interface for search results
 */
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated search result interface
 */
export interface PaginatedSearchResult<T> {
  items: T[];
  pagination: PaginationInfo;
}

/**
 * Configuration utility class
 */
export class ConfigUtils {
  private static readonly CONFIG_SECTION = 'agenticTools';

  /**
   * Get the current extension configuration
   */
  static getConfig(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);

    return {
      search: {
        pageSize: config.get('search.pageSize', 20),
        maxResults: config.get('search.maxResults', 200),
        debounceMs: config.get('search.debounceMs', 300),
        threshold: config.get('search.threshold', 0.3)
      },
      fileWatching: {
        debounceMs: config.get('fileWatching.debounceMs', 500)
      },
      performance: {
        enableEarlyTermination: config.get('performance.enableEarlyTermination', true),
        lowScoreThreshold: config.get('performance.lowScoreThreshold', 0.1)
      }
    };
  }

  /**
   * Get a specific configuration value
   */
  static getValue<T>(key: string, defaultValue: T): T {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    return config.get(key, defaultValue);
  }

  /**
   * Update a configuration value
   */
  static async setValue(key: string, value: any, target?: vscode.ConfigurationTarget): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    await config.update(key, value, target || vscode.ConfigurationTarget.Workspace);
  }

  /**
   * Watch for configuration changes
   */
  static onConfigChanged(callback: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(this.CONFIG_SECTION)) {
        callback(e);
      }
    });
  }

  /**
   * Create pagination info from results
   */
  static createPaginationInfo(
    totalItems: number,
    currentPage: number,
    pageSize: number
  ): PaginationInfo {
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      currentPage: Math.max(1, Math.min(currentPage, totalPages)),
      totalPages,
      pageSize,
      totalItems,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    };
  }

  /**
   * Paginate an array of results
   */
  static paginateResults<T>(
    items: T[],
    page: number,
    pageSize: number
  ): PaginatedSearchResult<T> {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedItems = items.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      pagination: this.createPaginationInfo(items.length, page, pageSize)
    };
  }

  /**
   * Validate configuration values
   */
  static validateConfig(config: Partial<ExtensionConfig>): string[] {
    const errors: string[] = [];

    if (config.search?.pageSize !== undefined) {
      if (config.search.pageSize < 5 || config.search.pageSize > 100) {
        errors.push('Page size must be between 5 and 100');
      }
    }

    if (config.search?.maxResults !== undefined) {
      if (config.search.maxResults < 10 || config.search.maxResults > 1000) {
        errors.push('Max results must be between 10 and 1000');
      }
    }

    if (config.search?.threshold !== undefined) {
      if (config.search.threshold < 0.1 || config.search.threshold > 1.0) {
        errors.push('Search threshold must be between 0.1 and 1.0');
      }
    }

    if (config.performance?.lowScoreThreshold !== undefined) {
      if (config.performance.lowScoreThreshold < 0.01 || config.performance.lowScoreThreshold > 0.5) {
        errors.push('Low score threshold must be between 0.01 and 0.5');
      }
    }

    return errors;
  }
}

/**
 * Debounce utility function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * AbortController utility for request cancellation
 */
export class CancellableOperation {
  private controller: AbortController;

  constructor() {
    this.controller = new AbortController();
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  get isAborted(): boolean {
    return this.controller.signal.aborted;
  }

  cancel(): void {
    this.controller.abort();
  }

  /**
   * Throw if the operation was cancelled
   */
  throwIfCancelled(): void {
    if (this.isAborted) {
      throw new Error('Operation was cancelled');
    }
  }

  /**
   * Create a promise that rejects if cancelled
   */
  static withCancellation<T>(
    promise: Promise<T>,
    signal: AbortSignal
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error('Operation was cancelled'));
        return;
      }

      const onAbort = () => {
        reject(new Error('Operation was cancelled'));
      };

      signal.addEventListener('abort', onAbort);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => {
          signal.removeEventListener('abort', onAbort);
        });
    });
  }
}