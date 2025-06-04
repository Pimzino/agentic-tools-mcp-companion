import * as vscode from 'vscode';
import { Task, CreateTaskInput, UpdateTaskInput, ProjectOption, ValidationResult } from '../models/index';
import { TaskService } from '../services/taskService';
import { WebviewUtils } from './webviewUtils';
import { TaskFormData, TaskFormDataWithParent, FormValidationResult } from '../types/formTypes';
import { ErrorHandler, ErrorUtils, ServiceError, ValidationError } from '../utils/errorHandler';

export interface TaskEditorData {
  mode: 'create' | 'edit';
  task?: Task;
  projectId?: string;
  projectName?: string;
}

export interface TaskEditorDataWithParent extends TaskEditorData {
  availableProjects?: ProjectOption[];
  selectedProjectId?: string;
  allowParentChange?: boolean;
}

/**
 * Task editor using webview for better editing experience
 */
export class TaskEditor {
  private panel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly taskService: TaskService
  ) {}

  /**
   * Show the task editor with enhanced parent selection support
   */
  public async show(data: TaskEditorData | TaskEditorDataWithParent): Promise<void> {
    // Create or reveal the webview panel
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    // Load parent options for enhanced mode
    const enhancedData = await this.prepareEditorData(data);

    this.panel = WebviewUtils.createWebviewPanel(
      'taskEditor',
      enhancedData.mode === 'create' ? 'Create Task' : 'Edit Task',
      vscode.ViewColumn.One,
      WebviewUtils.getWebviewOptions(this.extensionUri)
    );

    // Set the HTML content
    this.panel.webview.html = this.getWebviewContent(enhancedData);

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'save':
            await this.handleSave(message.data, enhancedData);
            break;
          case 'cancel':
            this.dispose();
            break;
          case 'load-projects':
            await this.handleLoadProjects();
            break;
          case 'validate-parent':
            await this.handleValidateParent(message.data);
            break;
        }
      },
      null,
      this.disposables
    );

    // Handle panel disposal
    this.panel.onDidDispose(
      () => {
        this.dispose();
      },
      null,
      this.disposables
    );

    // Send initial data to webview
    this.panel.webview.postMessage({
      type: 'initialize',
      data: enhancedData
    });
  }

  /**
   * Prepare editor data with parent selection options
   */
  private async prepareEditorData(data: TaskEditorData | TaskEditorDataWithParent): Promise<TaskEditorDataWithParent> {
    // Always enable parent selection based on design decision
    const enhancedData: TaskEditorDataWithParent = {
      ...data,
      allowParentChange: true
    };

    try {
      // Load available projects
      enhancedData.availableProjects = await this.taskService.getAvailableProjects();

      // Set selected project ID
      if (data.mode === 'create' && data.projectId) {
        enhancedData.selectedProjectId = data.projectId;
      } else if (data.mode === 'edit' && data.task) {
        enhancedData.selectedProjectId = data.task.projectId;
      }
    } catch (error) {
      console.error('Failed to load parent options:', error);
      // Fallback to basic mode if parent loading fails
      enhancedData.allowParentChange = false;
    }

    return enhancedData;
  }

  /**
   * Handle loading projects for parent selection
   */
  private async handleLoadProjects(): Promise<void> {
    try {
      const projects = await this.taskService.getAvailableProjects();
      this.panel?.webview.postMessage({
        type: 'projects-loaded',
        data: projects
      });
    } catch (error) {
      this.panel?.webview.postMessage({
        type: 'error',
        message: 'Failed to load projects'
      });
    }
  }

  /**
   * Handle parent validation
   */
  private async handleValidateParent(data: { projectId: string; taskId?: string }): Promise<void> {
    try {
      const validation = await this.taskService.validateParentAssignment(
        'task',
        null, // null for new tasks
        data.projectId
      );

      this.panel?.webview.postMessage({
        type: 'validation-result',
        data: validation
      });
    } catch (error) {
      this.panel?.webview.postMessage({
        type: 'validation-result',
        data: {
          isValid: false,
          errors: ['Failed to validate parent assignment'],
          warnings: [],
          requiresConfirmation: false
        }
      });
    }
  }

  /**
   * Handle save action from webview with parent selection support
   */
  private async handleSave(formData: TaskFormData | TaskFormDataWithParent, editorData: TaskEditorDataWithParent): Promise<void> {
    try {
      // Validate the form data
      const validation = this.validateFormData(formData);
      if (!validation.isValid) {
        this.panel?.webview.postMessage({
          type: 'validation-error',
          error: validation.error
        });
        return;
      }

      // Determine project ID from form data or editor data
      const projectId = this.getProjectId(formData, editorData);
      if (!projectId) {
        this.panel?.webview.postMessage({
          type: 'validation-error',
          error: 'Project selection is required'
        });
        return;
      }

      if (editorData.mode === 'create') {
        // Create new task with parent selection and enhanced fields
        const input: CreateTaskInput = {
          name: formData.name.trim(),
          details: formData.details.trim(),
          projectId: projectId,
          dependsOn: formData.dependsOn || [],
          priority: formData.priority || 5,
          complexity: formData.complexity,
          status: formData.status || 'pending',
          tags: formData.tags || [],
          estimatedHours: formData.estimatedHours
        };

        await this.taskService.createTaskWithParent(input);
        vscode.window.showInformationMessage(`Task "${input.name}" created successfully!`);
      } else {
        // Update existing task with potential parent change
        if (!editorData.task) {
          throw new Error('Task data is required for editing');
        }

        // Check if parent changed
        const parentChanged = this.hasParentChanged(formData, editorData);

        if (parentChanged) {
          // Validate parent assignment and show confirmation if needed
          const validation = await this.taskService.validateParentAssignment(
            'task',
            editorData.task.id,
            projectId
          );

          if (!validation.isValid) {
            this.panel?.webview.postMessage({
              type: 'validation-error',
              error: validation.errors.join(', ')
            });
            return;
          }

          if (validation.requiresConfirmation) {
            const confirmed = await this.showConfirmationDialog(validation.warnings);
            if (!confirmed) {return;}
          }

          // Perform move operation if parent changed with enhanced fields
          const updates: UpdateTaskInput = {
            name: formData.name.trim(),
            details: formData.details.trim(),
            completed: formData.completed,
            dependsOn: formData.dependsOn,
            priority: formData.priority,
            complexity: formData.complexity,
            status: formData.status,
            tags: formData.tags,
            estimatedHours: formData.estimatedHours,
            actualHours: formData.actualHours,
            ...(projectId !== editorData.task.projectId && { projectId })
          };

          await this.taskService.updateTaskWithParent(editorData.task.id, updates);
        } else {
          // Regular update without parent change with enhanced fields
          const updates: UpdateTaskInput = {
            name: formData.name.trim(),
            details: formData.details.trim(),
            completed: formData.completed,
            dependsOn: formData.dependsOn,
            priority: formData.priority,
            complexity: formData.complexity,
            status: formData.status,
            tags: formData.tags,
            estimatedHours: formData.estimatedHours,
            actualHours: formData.actualHours
          };

          await this.taskService.updateTask(editorData.task.id, updates);
        }

        vscode.window.showInformationMessage(`Task "${formData.name}" updated successfully!`);
      }

      // Close the editor
      this.dispose();
    } catch (error) {
      const serviceError = ErrorUtils.createServiceError('TaskEditor', 'handleSave', error);
      ErrorHandler.handleError(serviceError, ErrorHandler.createContext('task_editor_save', {
        mode: editorData.mode,
        taskId: editorData.task?.id,
        projectId: this.getProjectId(formData, editorData),
        taskName: formData.name
      }));
    }
  }

  /**
   * Get project ID from form data or editor data
   */
  private getProjectId(formData: TaskFormData | TaskFormDataWithParent, editorData: TaskEditorDataWithParent): string | undefined {
    // Check if form data includes project selection
    if ('projectId' in formData && formData.projectId) {
      return formData.projectId;
    }

    // Fall back to editor data
    return editorData.selectedProjectId || editorData.projectId;
  }

  /**
   * Check if parent has changed
   */
  private hasParentChanged(formData: TaskFormData | TaskFormDataWithParent, editorData: TaskEditorDataWithParent): boolean {
    if (editorData.mode === 'create') {return false;}

    const newProjectId = this.getProjectId(formData, editorData);
    const originalProjectId = editorData.task?.projectId;

    return newProjectId !== originalProjectId;
  }

  /**
   * Show confirmation dialog for cross-project moves
   */
  private async showConfirmationDialog(warnings: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      this.panel?.webview.postMessage({
        type: 'show-confirmation',
        message: 'Cross-project move detected',
        details: warnings,
        callback: 'confirmation-result'
      });

      // Set up one-time listener for response
      const disposable = this.panel?.webview.onDidReceiveMessage((message) => {
        if (message.type === 'confirmation-result') {
          disposable?.dispose();
          resolve(message.confirmed);
        }
      });

      if (disposable) {
        this.disposables.push(disposable);
      }
    });
  }

  /**
   * Validate form data
   */
  private validateFormData(data: TaskFormData): FormValidationResult {
    if (!data.name || data.name.trim().length === 0) {
      return { isValid: false, error: 'Task name is required' };
    }

    if (data.name.trim().length > 50) {
      return { isValid: false, error: 'Task name must be 50 characters or less' };
    }

    // No limit on details/content
    return { isValid: true };
  }

  /**
   * Generate the webview HTML content with parent selection support
   */
  private getWebviewContent(data: TaskEditorDataWithParent): string {
    const task = data.task;
    const isEdit = data.mode === 'edit';
    const hasParentSelection = data.allowParentChange && data.availableProjects && data.availableProjects.length > 0;
    const title = isEdit ? `Edit Task: ${task?.name}` : 'Create Task';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          ${WebviewUtils.getCommonCSS()}

          .parent-selection {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 16px;
            border-radius: 6px;
            margin-bottom: 20px;
            border: 1px solid var(--vscode-widget-border);
          }

          .parent-selection h3 {
            margin: 0 0 12px 0;
            font-size: 1.1em;
            color: var(--vscode-foreground);
          }

          .warning-message {
            background-color: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            color: var(--vscode-inputValidation-warningForeground);
            padding: 12px;
            border-radius: 4px;
            margin-top: 8px;
            display: flex;
            align-items: flex-start;
            gap: 8px;
          }

          .warning-icon {
            font-size: 16px;
            margin-top: 2px;
          }

          .warning-content strong {
            display: block;
            margin-bottom: 4px;
          }

          .current-parent-info {
            background-color: var(--vscode-editor-background);
            padding: 8px 12px;
            border-radius: 4px;
            margin-bottom: 12px;
            font-size: 0.9em;
            border-left: 3px solid var(--vscode-textBlockQuote-border);
          }

          .info-label {
            color: var(--vscode-descriptionForeground);
            font-weight: 500;
          }

          .info-value {
            color: var(--vscode-foreground);
            margin-top: 2px;
          }

          .helper-text {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
          }

          .confirmation-dialog {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .confirmation-content {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
            padding: 20px;
            max-width: 400px;
            width: 90%;
          }

          .confirmation-buttons {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 16px;
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 16px;
          }

          @media (max-width: 600px) {
            .form-row {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="form-container">
          <h1>${title}</h1>

          ${hasParentSelection ? `
            <div class="parent-selection">
              <h3>Project Selection</h3>

              ${isEdit ? `
                <div class="current-parent-info" id="currentParentInfo">
                  <div class="info-label">Current Project:</div>
                  <div class="info-value" id="currentParentValue"></div>
                </div>
              ` : ''}

              <div class="form-group">
                <label for="projectSelect">Project *</label>
                <select id="projectSelect" name="projectId" required>
                  <option value="">Select a project...</option>
                  ${data.availableProjects?.map(project =>
                    `<option value="${project.id}" ${project.id === data.selectedProjectId ? 'selected' : ''}>
                      ${project.name} (${project.taskCount} tasks)
                    </option>`
                  ).join('') || ''}
                </select>
                <div class="helper-text">Choose the project that will contain this task</div>
                <div class="error-message"></div>
              </div>

              <div class="warning-message" id="crossProjectWarning" style="display: none;">
                <div class="warning-icon">⚠️</div>
                <div class="warning-content">
                  <strong>Cross-project move detected</strong>
                  <p>This will move the task to a different project. All subtasks will be moved as well.</p>
                </div>
              </div>
            </div>
          ` : ''}

          <form id="taskForm">
            <div class="form-group">
              <label for="taskName">Task Name *</label>
              <input
                type="text"
                id="taskName"
                name="name"
                placeholder="Enter task name"
                value="${task?.name || ''}"
                maxlength="50"
                required
              />
              <div class="char-counter" id="nameCounter">0/50</div>
              <div class="error-message"></div>
            </div>

            <div class="form-group">
              <label for="taskDetails">Task Details</label>
              <textarea
                id="taskDetails"
                name="details"
                placeholder="Enter detailed description of the task..."
              >${task?.details || ''}</textarea>
              <div class="error-message"></div>
            </div>

            <!-- Enhanced Task Fields -->
            <div class="form-row">
              <div class="form-group">
                <label for="taskPriority">Priority</label>
                <select id="taskPriority" name="priority">
                  <option value="">Default (5)</option>
                  <option value="1" ${task?.priority === 1 ? 'selected' : ''}>1 - Lowest</option>
                  <option value="2" ${task?.priority === 2 ? 'selected' : ''}>2 - Low</option>
                  <option value="3" ${task?.priority === 3 ? 'selected' : ''}>3 - Below Normal</option>
                  <option value="4" ${task?.priority === 4 ? 'selected' : ''}>4 - Normal</option>
                  <option value="5" ${task?.priority === 5 ? 'selected' : ''}>5 - Normal</option>
                  <option value="6" ${task?.priority === 6 ? 'selected' : ''}>6 - Above Normal</option>
                  <option value="7" ${task?.priority === 7 ? 'selected' : ''}>7 - High</option>
                  <option value="8" ${task?.priority === 8 ? 'selected' : ''}>8 - Higher</option>
                  <option value="9" ${task?.priority === 9 ? 'selected' : ''}>9 - Very High</option>
                  <option value="10" ${task?.priority === 10 ? 'selected' : ''}>10 - Highest</option>
                </select>
                <div class="helper-text">Task priority (1-10, where 10 is highest)</div>
              </div>

              <div class="form-group">
                <label for="taskComplexity">Complexity</label>
                <select id="taskComplexity" name="complexity">
                  <option value="">Not specified</option>
                  <option value="1" ${task?.complexity === 1 ? 'selected' : ''}>1 - Very Simple</option>
                  <option value="2" ${task?.complexity === 2 ? 'selected' : ''}>2 - Simple</option>
                  <option value="3" ${task?.complexity === 3 ? 'selected' : ''}>3 - Easy</option>
                  <option value="4" ${task?.complexity === 4 ? 'selected' : ''}>4 - Below Average</option>
                  <option value="5" ${task?.complexity === 5 ? 'selected' : ''}>5 - Average</option>
                  <option value="6" ${task?.complexity === 6 ? 'selected' : ''}>6 - Above Average</option>
                  <option value="7" ${task?.complexity === 7 ? 'selected' : ''}>7 - Complex</option>
                  <option value="8" ${task?.complexity === 8 ? 'selected' : ''}>8 - Very Complex</option>
                  <option value="9" ${task?.complexity === 9 ? 'selected' : ''}>9 - Extremely Complex</option>
                  <option value="10" ${task?.complexity === 10 ? 'selected' : ''}>10 - Most Complex</option>
                </select>
                <div class="helper-text">Task complexity (1-10, where 10 is most complex)</div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="taskStatus">Status</label>
                <select id="taskStatus" name="status">
                  <option value="pending" ${(task?.status || 'pending') === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                  <option value="in-progress" ${task?.status === 'in-progress' ? 'selected' : ''}>🔄 In Progress</option>
                  <option value="blocked" ${task?.status === 'blocked' ? 'selected' : ''}>🚫 Blocked</option>
                  <option value="done" ${task?.status === 'done' ? 'selected' : ''}>✅ Done</option>
                </select>
                <div class="helper-text">Current task status</div>
              </div>

              <div class="form-group">
                <label for="taskEstimatedHours">Estimated Hours</label>
                <input
                  type="number"
                  id="taskEstimatedHours"
                  name="estimatedHours"
                  placeholder="0"
                  value="${task?.estimatedHours || ''}"
                  min="0"
                  step="0.5"
                />
                <div class="helper-text">Estimated time to complete (hours)</div>
              </div>
            </div>

            ${isEdit ? `
              <div class="form-group">
                <label for="taskActualHours">Actual Hours</label>
                <input
                  type="number"
                  id="taskActualHours"
                  name="actualHours"
                  placeholder="0"
                  value="${task?.actualHours || ''}"
                  min="0"
                  step="0.5"
                />
                <div class="helper-text">Actual time spent (hours)</div>
              </div>
            ` : ''}

            <div class="form-group">
              <label for="taskTags">Tags</label>
              <input
                type="text"
                id="taskTags"
                name="tags"
                placeholder="Enter tags separated by commas (e.g., frontend, urgent, bug)"
                value="${task?.tags ? task.tags.join(', ') : ''}"
              />
              <div class="helper-text">Tags for categorization and filtering (comma-separated)</div>
            </div>

            ${isEdit ? `
              <div class="form-group">
                <div class="checkbox-group">
                  <input
                    type="checkbox"
                    id="taskCompleted"
                    name="completed"
                    ${task?.completed ? 'checked' : ''}
                  />
                  <label for="taskCompleted">Mark as completed</label>
                </div>
              </div>
            ` : ''}

            <div class="button-group">
              <button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>
              <button type="submit" class="btn-primary" id="saveBtn">
                ${isEdit ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>

        <!-- Confirmation Dialog -->
        <div class="confirmation-dialog" id="confirmationDialog">
          <div class="confirmation-content">
            <h3 id="confirmationTitle">Confirm Action</h3>
            <p id="confirmationMessage"></p>
            <div id="confirmationDetails"></div>
            <div class="confirmation-buttons">
              <button type="button" class="btn-secondary" id="confirmationCancel">Cancel</button>
              <button type="button" class="btn-primary" id="confirmationConfirm">Confirm</button>
            </div>
          </div>
        </div>

        <script>
          ${WebviewUtils.getCommonJS()}

          let editorData = null;

          // Initialize form
          function initializeForm(data) {
            editorData = data;
            setupCharCounter('taskName', 50, 'nameCounter');

            if (data.allowParentChange && data.mode === 'edit') {
              showCurrentParent(data);
            }

            setupParentSelection();
          }

          // Show current parent info
          function showCurrentParent(data) {
            const info = document.getElementById('currentParentInfo');
            const value = document.getElementById('currentParentValue');

            if (data.task && data.availableProjects) {
              const currentProject = data.availableProjects.find(p => p.id === data.task.projectId);
              if (currentProject) {
                value.textContent = currentProject.name;
                info.style.display = 'block';
              }
            }
          }

          // Setup parent selection handling
          function setupParentSelection() {
            const projectSelect = document.getElementById('projectSelect');
            if (!projectSelect) return;

            projectSelect.addEventListener('change', (e) => {
              checkForCrossProjectMove();
            });
          }

          // Check for cross-project move
          function checkForCrossProjectMove() {
            if (!editorData || editorData.mode !== 'edit') return;

            const selectedProjectId = document.getElementById('projectSelect').value;
            const originalProjectId = editorData.task?.projectId;

            const warning = document.getElementById('crossProjectWarning');

            if (selectedProjectId && originalProjectId && selectedProjectId !== originalProjectId) {
              warning.style.display = 'flex';
            } else {
              warning.style.display = 'none';
            }
          }

          // Handle confirmation dialog
          function showConfirmationDialog(title, message, details) {
            return new Promise((resolve) => {
              const dialog = document.getElementById('confirmationDialog');
              const titleEl = document.getElementById('confirmationTitle');
              const messageEl = document.getElementById('confirmationMessage');
              const detailsEl = document.getElementById('confirmationDetails');

              titleEl.textContent = title;
              messageEl.textContent = message;
              detailsEl.innerHTML = details.map(d => '<p>' + d + '</p>').join('');

              dialog.style.display = 'flex';

              document.getElementById('confirmationConfirm').onclick = () => {
                dialog.style.display = 'none';
                resolve(true);
              };

              document.getElementById('confirmationCancel').onclick = () => {
                dialog.style.display = 'none';
                resolve(false);
              };
            });
          }

          // Form submission
          document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();

            const formData = new FormData(e.target);
            const data = {
              name: formData.get('name'),
              details: formData.get('details') || '',
              completed: formData.has('completed'),
              priority: formData.get('priority') ? parseInt(formData.get('priority')) : undefined,
              complexity: formData.get('complexity') ? parseInt(formData.get('complexity')) : undefined,
              status: formData.get('status') || 'pending',
              estimatedHours: formData.get('estimatedHours') ? parseFloat(formData.get('estimatedHours')) : undefined,
              actualHours: formData.get('actualHours') ? parseFloat(formData.get('actualHours')) : undefined,
              tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []
            };

            // Add project selection if available
            const projectSelect = document.getElementById('projectSelect');
            if (projectSelect && projectSelect.value) {
              data.projectId = projectSelect.value;
            }

            // Validate
            let isValid = true;
            isValid &= validateField('taskName', (value) => value.trim().length > 0 && value.trim().length <= 50, 'Task name is required and must be 50 characters or less');

            // Validate project selection if parent selection is enabled
            if (projectSelect) {
              isValid &= validateField('projectSelect', (value) => value.trim().length > 0, 'Project selection is required');
            }

            if (isValid) {
              vscode.postMessage({ type: 'save', data });
            }
          });

          // Cancel button
          document.getElementById('cancelBtn').addEventListener('click', () => {
            vscode.postMessage({ type: 'cancel' });
          });

          // Handle messages from extension
          window.addEventListener('message', event => {
            const message = event.data;

            switch (message.type) {
              case 'initialize':
                initializeForm(message.data);
                break;

              case 'show-confirmation':
                showConfirmationDialog(message.message, '', message.details).then(confirmed => {
                  vscode.postMessage({ type: 'confirmation-result', confirmed });
                });
                break;

              case 'validation-error':
                // Show validation error
                const errorElements = document.querySelectorAll('.error-message');
                errorElements.forEach(el => el.textContent = '');

                // Show the error in a general location
                if (errorElements.length > 0) {
                  errorElements[0].textContent = message.error;
                }
                break;
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Dispose of the editor and clean up resources
   */
  public dispose(): void {
    this.panel?.dispose();
    this.panel = undefined;

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
