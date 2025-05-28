/**
 * Project data model for the task management system
 * This interface matches exactly with the MCP server implementation
 */
export interface Project {
  /** Unique identifier for the project */
  id: string;
  /** Project name */
  name: string;
  /** Project description/overview */
  description: string;
  /** Timestamp when the project was created */
  createdAt: string;
  /** Timestamp when the project was last updated */
  updatedAt: string;
}

/**
 * Input data for creating a new project
 */
export interface CreateProjectInput {
  /** Project name */
  name: string;
  /** Project description/overview */
  description: string;
}

/**
 * Input data for updating an existing project
 */
export interface UpdateProjectInput {
  /** Project name (optional) */
  name?: string;
  /** Project description/overview (optional) */
  description?: string;
}
