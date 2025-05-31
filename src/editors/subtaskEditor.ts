import * as vscode from 'vscode';
import { Subtask, CreateSubtaskInput, UpdateSubtaskInput, ProjectOption, TaskOption, ValidationResult } from '../models/index';
import { TaskService } from '../services/taskService';
import { WebviewUtils } from './webviewUtils';
import { SubtaskFormData, SubtaskFormDataWithParent, FormValidationResult } from '../types/formTypes';
import { ErrorHandler, ErrorUtils, ServiceError, ValidationError } from '../utils/errorHandler';

export interface SubtaskEditorData {
  mode: 'create' | 'edit';
  subtask?: Subtask;
  taskId?: string;
  taskName?: string;
}

export interface SubtaskEditorDataWithParent extends SubtaskEditorData {
  availableProjects?: ProjectOption[];
  availableTasks?: TaskOption[];
  selectedProjectId?: string;
  selectedTaskId?: string;
  allowParentChange?: boolean;
}

/**
 * Subtask editor using webview for better editing experience
 */
export class SubtaskEditor {
  private panel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly taskService: TaskService
  ) {}

  /**
   * Show the subtask editor with enhanced parent selection support
   */
  public async show(data: SubtaskEditorData | SubtaskEditorDataWithParent): Promise<void> {
    // Create or reveal the webview panel
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    // Load parent options for enhanced mode
    const enhancedData = await this.prepareEditorData(data);

    this.panel = WebviewUtils.createWebviewPanel(
      'subtaskEditor',
      enhancedData.mode === 'create' ? 'Create Subtask' : 'Edit Subtask',
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
          case 'load-tasks':
            await this.handleLoadTasks(message.data);
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
  private async prepareEditorData(data: SubtaskEditorData | SubtaskEditorDataWithParent): Promise<SubtaskEditorDataWithParent> {
    // Always enable parent selection based on design decision
    const enhancedData: SubtaskEditorDataWithParent = {
      ...data,
      allowParentChange: true
    };

    try {
      // Load available projects
      enhancedData.availableProjects = await this.taskService.getAvailableProjects();

      // Load available tasks for subtask assignment
      enhancedData.availableTasks = await this.taskService.getAvailableTasksForSubtask(
        data.mode === 'edit' ? data.subtask?.id : undefined
      );

      // Set selected IDs
      if (data.mode === 'create' && data.taskId) {
        enhancedData.selectedTaskId = data.taskId;

        // Find the project for this task
        const task = await this.taskService.getTask(data.taskId);
        if (task) {
          enhancedData.selectedProjectId = task.projectId;
        }
      } else if (data.mode === 'edit' && data.subtask) {
        enhancedData.selectedTaskId = data.subtask.taskId;
        enhancedData.selectedProjectId = data.subtask.projectId;
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
   * Handle loading tasks for a specific project
   */
  private async handleLoadTasks(data: { projectId: string; excludeSubtaskId?: string }): Promise<void> {
    try {
      const tasks = await this.taskService.getTasksInProject(data.projectId, data.excludeSubtaskId);
      this.panel?.webview.postMessage({
        type: 'tasks-loaded',
        data: tasks
      });
    } catch (error) {
      this.panel?.webview.postMessage({
        type: 'error',
        message: 'Failed to load tasks'
      });
    }
  }

  /**
   * Handle parent validation
   */
  private async handleValidateParent(data: { taskId: string; subtaskId?: string }): Promise<void> {
    try {
      const validation = await this.taskService.validateParentAssignment(
        'subtask',
        data.subtaskId || null,
        data.taskId
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
  private async handleSave(formData: SubtaskFormData | SubtaskFormDataWithParent, editorData: SubtaskEditorDataWithParent): Promise<void> {
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

      // Determine task ID from form data or editor data
      const taskId = this.getTaskId(formData, editorData);
      if (!taskId) {
        this.panel?.webview.postMessage({
          type: 'validation-error',
          error: 'Task selection is required'
        });
        return;
      }

      if (editorData.mode === 'create') {
        // Create new subtask with parent selection
        const input: CreateSubtaskInput = {
          name: formData.name.trim(),
          details: formData.details.trim(),
          taskId: taskId
        };

        await this.taskService.createSubtaskWithParent(input);
        vscode.window.showInformationMessage(`Subtask "${input.name}" created successfully!`);
      } else {
        // Update existing subtask with potential parent change
        if (!editorData.subtask) {
          throw new Error('Subtask data is required for editing');
        }

        // Check if parent changed
        const parentChanged = this.hasParentChanged(formData, editorData);

        if (parentChanged) {
          // Validate parent assignment and show confirmation if needed
          const validation = await this.taskService.validateParentAssignment(
            'subtask',
            editorData.subtask.id,
            taskId
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

          // Perform move operation if parent changed
          const updates: UpdateSubtaskInput = {
            name: formData.name.trim(),
            details: formData.details.trim(),
            completed: formData.completed,
            ...(taskId !== editorData.subtask.taskId && { taskId })
          };

          await this.taskService.updateSubtaskWithParent(editorData.subtask.id, updates);
        } else {
          // Regular update without parent change
          const updates: UpdateSubtaskInput = {
            name: formData.name.trim(),
            details: formData.details.trim(),
            completed: formData.completed
          };

          await this.taskService.updateSubtask(editorData.subtask.id, updates);
        }

        vscode.window.showInformationMessage(`Subtask "${formData.name}" updated successfully!`);
      }

      // Close the editor
      this.dispose();
    } catch (error) {
      const serviceError = ErrorUtils.createServiceError('SubtaskEditor', 'handleSave', error);
      ErrorHandler.handleError(serviceError, ErrorHandler.createContext('subtask_editor_save', {
        mode: editorData.mode,
        subtaskId: editorData.subtask?.id,
        taskId: this.getTaskId(formData, editorData),
        subtaskName: formData.name
      }));
    }
  }

  /**
   * Get task ID from form data or editor data
   */
  private getTaskId(formData: SubtaskFormData | SubtaskFormDataWithParent, editorData: SubtaskEditorDataWithParent): string | undefined {
    // Check if form data includes task selection
    if ('taskId' in formData && formData.taskId) {
      return formData.taskId;
    }

    // Fall back to editor data
    return editorData.selectedTaskId || editorData.taskId;
  }

  /**
   * Check if parent has changed
   */
  private hasParentChanged(formData: SubtaskFormData | SubtaskFormDataWithParent, editorData: SubtaskEditorDataWithParent): boolean {
    if (editorData.mode === 'create') {return false;}

    const newTaskId = this.getTaskId(formData, editorData);
    const originalTaskId = editorData.subtask?.taskId;

    return newTaskId !== originalTaskId;
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
  private validateFormData(data: SubtaskFormData): FormValidationResult {
    if (!data.name || data.name.trim().length === 0) {
      return { isValid: false, error: 'Subtask name is required' };
    }

    if (data.name.trim().length > 50) {
      return { isValid: false, error: 'Subtask name must be 50 characters or less' };
    }

    // No limit on details/content
    return { isValid: true };
  }

  /**
   * Generate the webview HTML content with two-step parent selection support
   */
  private getWebviewContent(data: SubtaskEditorDataWithParent): string {
    const subtask = data.subtask;
    const isEdit = data.mode === 'edit';
    const hasParentSelection = data.allowParentChange && data.availableProjects && data.availableProjects.length > 0;
    const title = isEdit ? `Edit Subtask: ${subtask?.name}` : 'Create Subtask';

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
        </style>
      </head>
      <body>
        <div class="form-container">
          <h1>${title}</h1>

          ${hasParentSelection ? `
            <div class="parent-selection">
              <h3>Parent Selection</h3>

              ${isEdit ? `
                <div class="current-parent-info" id="currentParentInfo">
                  <div class="info-label">Current Parent:</div>
                  <div class="info-value" id="currentParentValue"></div>
                </div>
              ` : ''}

              <!-- Step 1: Project Selection -->
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
                <div class="helper-text">Choose the project containing the parent task</div>
                <div class="error-message"></div>
              </div>

              <!-- Step 2: Task Selection -->
              <div class="form-group" id="taskSelection" ${!data.selectedProjectId ? 'style="display: none;"' : ''}>
                <label for="taskSelect">Parent Task *</label>
                <select id="taskSelect" name="taskId" required>
                  <option value="">Select a task...</option>
                  ${data.availableTasks?.filter(task => task.projectId === data.selectedProjectId).map(task =>
                    `<option value="${task.id}" ${task.id === data.selectedTaskId ? 'selected' : ''}>
                      ${task.name} (${task.subtaskCount} subtasks)
                    </option>`
                  ).join('') || ''}
                </select>
                <div class="helper-text">Choose the task that will contain this subtask</div>
                <div class="error-message"></div>
              </div>

              <div class="warning-message" id="crossProjectWarning" style="display: none;">
                <div class="warning-icon">⚠️</div>
                <div class="warning-content">
                  <strong>Cross-project move detected</strong>
                  <p>This will move the subtask to a different project.</p>
                </div>
              </div>
            </div>
          ` : ''}

          <form id="subtaskForm">
            <div class="form-group">
              <label for="subtaskName">Subtask Name *</label>
              <input
                type="text"
                id="subtaskName"
                name="name"
                placeholder="Enter subtask name"
                value="${subtask?.name || ''}"
                maxlength="50"
                required
              />
              <div class="char-counter" id="nameCounter">0/50</div>
              <div class="error-message"></div>
            </div>

            <div class="form-group">
              <label for="subtaskDetails">Subtask Details</label>
              <textarea
                id="subtaskDetails"
                name="details"
                placeholder="Enter detailed description of the subtask..."
              >${subtask?.details || ''}</textarea>
              <div class="error-message"></div>
            </div>

            ${isEdit ? `
              <div class="form-group">
                <div class="checkbox-group">
                  <input
                    type="checkbox"
                    id="subtaskCompleted"
                    name="completed"
                    ${subtask?.completed ? 'checked' : ''}
                  />
                  <label for="subtaskCompleted">Mark as completed</label>
                </div>
              </div>
            ` : ''}

            <div class="button-group">
              <button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>
              <button type="submit" class="btn-primary" id="saveBtn">
                ${isEdit ? 'Update Subtask' : 'Create Subtask'}
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
            setupCharCounter('subtaskName', 50, 'nameCounter');

            if (data.allowParentChange && data.mode === 'edit') {
              showCurrentParent(data);
            }

            setupParentSelection();
          }

          // Show current parent info
          function showCurrentParent(data) {
            const info = document.getElementById('currentParentInfo');
            const value = document.getElementById('currentParentValue');

            if (data.subtask && data.availableTasks) {
              const currentTask = data.availableTasks.find(t => t.id === data.subtask.taskId);
              if (currentTask) {
                value.textContent = currentTask.projectName + ' > ' + currentTask.name;
                info.style.display = 'block';
              }
            }
          }

          // Setup parent selection handling
          function setupParentSelection() {
            const projectSelect = document.getElementById('projectSelect');
            const taskSelect = document.getElementById('taskSelect');
            const taskSelection = document.getElementById('taskSelection');

            if (!projectSelect) return;

            // Project selection change
            projectSelect.addEventListener('change', (e) => {
              const projectId = e.target.value;

              if (projectId) {
                // Load tasks for selected project
                if (editorData && editorData.availableTasks) {
                  const projectTasks = editorData.availableTasks.filter(t => t.projectId === projectId);
                  populateTaskDropdown(projectTasks);
                } else {
                  // Request tasks from extension
                  vscode.postMessage({
                    type: 'load-tasks',
                    data: {
                      projectId: projectId,
                      excludeSubtaskId: editorData?.subtask?.id
                    }
                  });
                }
                taskSelection.style.display = 'block';
              } else {
                taskSelection.style.display = 'none';
                taskSelect.innerHTML = '<option value="">Select a task...</option>';
              }

              checkForCrossProjectMove();
            });

            // Task selection change
            if (taskSelect) {
              taskSelect.addEventListener('change', (e) => {
                checkForCrossProjectMove();
              });
            }
          }

          // Populate task dropdown
          function populateTaskDropdown(tasks) {
            const taskSelect = document.getElementById('taskSelect');
            if (!taskSelect) return;

            taskSelect.innerHTML = '<option value="">Select a task...</option>';

            tasks.forEach(task => {
              const option = document.createElement('option');
              option.value = task.id;
              option.textContent = task.name + ' (' + task.subtaskCount + ' subtasks)';

              if (editorData && task.id === editorData.selectedTaskId) {
                option.selected = true;
              }

              taskSelect.appendChild(option);
            });
          }

          // Check for cross-project move
          function checkForCrossProjectMove() {
            if (!editorData || editorData.mode !== 'edit') return;

            const selectedProjectId = document.getElementById('projectSelect').value;
            const originalProjectId = editorData.subtask?.projectId;

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
          document.getElementById('subtaskForm').addEventListener('submit', (e) => {
            e.preventDefault();

            const formData = new FormData(e.target);
            const data = {
              name: formData.get('name'),
              details: formData.get('details') || '',
              completed: formData.has('completed')
            };

            // Add parent selection if available
            const projectSelect = document.getElementById('projectSelect');
            const taskSelect = document.getElementById('taskSelect');

            if (projectSelect && projectSelect.value) {
              data.projectId = projectSelect.value;
            }

            if (taskSelect && taskSelect.value) {
              data.taskId = taskSelect.value;
            }

            // Validate
            let isValid = true;
            isValid &= validateField('subtaskName', (value) => value.trim().length > 0 && value.trim().length <= 50, 'Subtask name is required and must be 50 characters or less');

            // Validate parent selection if enabled
            if (projectSelect) {
              isValid &= validateField('projectSelect', (value) => value.trim().length > 0, 'Project selection is required');
            }

            if (taskSelect) {
              isValid &= validateField('taskSelect', (value) => value.trim().length > 0, 'Task selection is required');
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

              case 'tasks-loaded':
                populateTaskDropdown(message.data);
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
