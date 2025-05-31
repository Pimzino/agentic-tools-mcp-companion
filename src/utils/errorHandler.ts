import * as vscode from 'vscode';

/**
 * Base class for all application-specific errors
 */
export abstract class BaseError extends Error {
  abstract readonly code: string;
  abstract readonly category: ErrorCategory;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  FILE_OPERATION = 'file_operation',
  WORKSPACE = 'workspace',
  SERVICE = 'service',
  USER_INPUT = 'user_input',
  NETWORK = 'network',
  SYSTEM = 'system'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Validation-related errors
 */
export class ValidationError extends BaseError {
  readonly code = 'VALIDATION_ERROR';
  readonly category = ErrorCategory.VALIDATION;
  public readonly field?: string;

  constructor(message: string, field?: string, context?: Record<string, unknown>) {
    super(message, context);
    this.field = field;
  }
}

/**
 * File operation errors (read, write, delete, etc.)
 */
export class FileOperationError extends BaseError {
  readonly code = 'FILE_OPERATION_ERROR';
  readonly category = ErrorCategory.FILE_OPERATION;
  public readonly operation: string;
  public readonly filePath?: string;

  constructor(message: string, operation: string, filePath?: string, context?: Record<string, unknown>) {
    super(message, context);
    this.operation = operation;
    this.filePath = filePath;
  }
}

/**
 * Workspace-related errors (permission, structure, etc.)
 */
export class WorkspaceError extends BaseError {
  readonly code = 'WORKSPACE_ERROR';
  readonly category = ErrorCategory.WORKSPACE;
  public readonly workspacePath?: string;

  constructor(message: string, workspacePath?: string, context?: Record<string, unknown>) {
    super(message, context);
    this.workspacePath = workspacePath;
  }
}

/**
 * Service-level errors (business logic, data access, etc.)
 */
export class ServiceError extends BaseError {
  readonly code = 'SERVICE_ERROR';
  readonly category = ErrorCategory.SERVICE;
  public readonly service: string;
  public readonly operation?: string;

  constructor(message: string, service: string, operation?: string, context?: Record<string, unknown>) {
    super(message, context);
    this.service = service;
    this.operation = operation;
  }
}

/**
 * Error context interface for additional debugging information
 */
export interface ErrorContext {
  operation?: string;
  userId?: string;
  sessionId?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Error handling utility class
 */
export class ErrorHandler {
  /**
   * Handle errors with appropriate user messaging and logging
   */
  static handleError(error: unknown, context?: ErrorContext): void {
    const errorInfo = this.analyzeError(error, context);

    // Log error for debugging
    console.error('Error occurred:', {
      error: errorInfo,
      context,
      stack: error instanceof Error ? error.stack : undefined
    });

    // Show appropriate user message
    this.showUserMessage(errorInfo);
  }

  /**
   * Analyze error and determine appropriate response
   */
  static analyzeError(error: unknown, context?: ErrorContext): ErrorInfo {
    if (error instanceof BaseError) {
      return {
        message: error.message,
        code: error.code,
        category: error.category,
        severity: this.determineSeverity(error),
        userMessage: this.getUserFriendlyMessage(error),
        context: { ...error.context, ...context }
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        code: 'UNKNOWN_ERROR',
        category: this.categorizeGenericError(error),
        severity: ErrorSeverity.MEDIUM,
        userMessage: this.getGenericUserMessage(error),
        context
      };
    }

    return {
      message: String(error),
      code: 'UNKNOWN_ERROR',
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      userMessage: 'An unexpected error occurred. Please try again.',
      context
    };
  }

  /**
   * Show appropriate user message based on error severity
   */
  private static showUserMessage(errorInfo: ErrorInfo): void {
    const message = errorInfo.userMessage;

    switch (errorInfo.severity) {
      case ErrorSeverity.CRITICAL:
        vscode.window.showErrorMessage(message, { modal: true });
        break;
      case ErrorSeverity.HIGH:
        vscode.window.showErrorMessage(message);
        break;
      case ErrorSeverity.MEDIUM:
        vscode.window.showWarningMessage(message);
        break;
      case ErrorSeverity.LOW:
        vscode.window.showInformationMessage(message);
        break;
    }
  }

  /**
   * Determine error severity based on error type and context
   */
  private static determineSeverity(error: BaseError): ErrorSeverity {
    switch (error.category) {
      case ErrorCategory.VALIDATION:
      case ErrorCategory.USER_INPUT:
        return ErrorSeverity.LOW;
      case ErrorCategory.FILE_OPERATION:
        return error.message.includes('permission') ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;
      case ErrorCategory.WORKSPACE:
        return ErrorSeverity.HIGH;
      case ErrorCategory.SERVICE:
        return ErrorSeverity.MEDIUM;
      case ErrorCategory.NETWORK:
        return ErrorSeverity.MEDIUM;
      case ErrorCategory.SYSTEM:
        return ErrorSeverity.HIGH;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * Get user-friendly message for custom errors
   */
  private static getUserFriendlyMessage(error: BaseError): string {
    switch (error.category) {
      case ErrorCategory.VALIDATION:
        return `Validation failed: ${error.message}`;
      case ErrorCategory.FILE_OPERATION:
        const fileError = error as FileOperationError;
        return `File operation failed: Unable to ${fileError.operation}${fileError.filePath ? ` file "${fileError.filePath}"` : ''}. ${error.message}`;
      case ErrorCategory.WORKSPACE:
        return `Workspace error: ${error.message}. Please check your workspace configuration.`;
      case ErrorCategory.SERVICE:
        const serviceError = error as ServiceError;
        return `${serviceError.service} service error: ${error.message}`;
      default:
        return error.message;
    }
  }

  /**
   * Get user-friendly message for generic errors
   */
  private static getGenericUserMessage(error: Error): string {
    if (error.message.includes('permission') || error.message.includes('access')) {
      return 'Permission denied. Please check file permissions and try again.';
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network error occurred. Please check your connection and try again.';
    }
    if (error.message.includes('timeout')) {
      return 'Operation timed out. Please try again.';
    }
    return `An error occurred: ${error.message}`;
  }

  /**
   * Categorize generic errors based on error message
   */
  private static categorizeGenericError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();

    if (message.includes('permission') || message.includes('access')) {
      return ErrorCategory.FILE_OPERATION;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('workspace') || message.includes('folder')) {
      return ErrorCategory.WORKSPACE;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }

    return ErrorCategory.SYSTEM;
  }

  /**
   * Create error context for operations
   */
  static createContext(operation: string, additionalData?: Record<string, unknown>): ErrorContext {
    return {
      operation,
      additionalData,
      sessionId: this.getSessionId()
    };
  }

  /**
   * Wrap async operations with error handling
   */
  static async wrapAsync<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, context);
      throw error; // Re-throw to allow caller to handle if needed
    }
  }

  /**
   * Get session ID for tracking (simple implementation)
   */
  private static getSessionId(): string {
    if (!this._sessionId) {
      this._sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    return this._sessionId;
  }

  private static _sessionId: string;
}

/**
 * Error information structure
 */
export interface ErrorInfo {
  message: string;
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage: string;
  context?: ErrorContext;
}

/**
 * Utility functions for common error scenarios
 */
export class ErrorUtils {
  /**
   * Create file operation error with context
   */
  static createFileError(operation: string, filePath: string, originalError: unknown): FileOperationError {
    const message = originalError instanceof Error ? originalError.message : String(originalError);
    return new FileOperationError(
      message,
      operation,
      filePath,
      { originalError: originalError instanceof Error ? originalError.message : originalError }
    );
  }

  /**
   * Create validation error with field context
   */
  static createValidationError(message: string, field?: string, value?: unknown): ValidationError {
    return new ValidationError(message, field, { value });
  }

  /**
   * Create service error with operation context
   */
  static createServiceError(service: string, operation: string, originalError: unknown): ServiceError {
    const message = originalError instanceof Error ? originalError.message : String(originalError);
    return new ServiceError(
      message,
      service,
      operation,
      { originalError: originalError instanceof Error ? originalError.message : originalError }
    );
  }

  /**
   * Create workspace error with path context
   */
  static createWorkspaceError(message: string, workspacePath?: string): WorkspaceError {
    return new WorkspaceError(message, workspacePath);
  }

  /**
   * Check if error is recoverable (user can retry)
   */
  static isRecoverable(error: unknown): boolean {
    if (error instanceof BaseError) {
      return error.category === ErrorCategory.NETWORK ||
             error.category === ErrorCategory.SERVICE ||
             (error.category === ErrorCategory.FILE_OPERATION && !error.message.includes('permission'));
    }
    return true; // Assume generic errors are recoverable
  }

  /**
   * Extract root cause from nested errors
   */
  static getRootCause(error: unknown): string {
    if (error instanceof BaseError && error.context?.originalError) {
      return String(error.context.originalError);
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}