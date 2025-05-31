import * as vscode from 'vscode';
import { Task, CreateTaskInput, UpdateTaskInput } from '../models/task';
import { TaskService } from '../services/taskService';
import { WebviewUtils } from './webviewUtils';
import { TaskFormData, FormValidationResult } from '../types/formTypes';
import { ErrorHandler, ErrorUtils, ServiceError, ValidationError } from '../utils/errorHandler';

export interface TaskEditorData {
  mode: 'create' | 'edit';
  task?: Task;
  projectId?: string;
  projectName?: string;
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
   * Show the task editor
   */
  public async show(data: TaskEditorData): Promise<void> {
    // Create or reveal the webview panel
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = WebviewUtils.createWebviewPanel(
      'taskEditor',
      data.mode === 'create' ? 'Create Task' : 'Edit Task',
      vscode.ViewColumn.One,
      WebviewUtils.getWebviewOptions(this.extensionUri)
    );

    // Set the HTML content
    this.panel.webview.html = this.getWebviewContent(data);

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'save':
            await this.handleSave(message.data, data);
            break;
          case 'cancel':
            this.dispose();
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
      data: data
    });
  }

  /**
   * Handle save action from webview
   */
  private async handleSave(formData: TaskFormData, editorData: TaskEditorData): Promise<void> {
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

      if (editorData.mode === 'create') {
        // Create new task
        if (!editorData.projectId) {
          throw new Error('Project ID is required for creating tasks');
        }

        const input: CreateTaskInput = {
          name: formData.name.trim(),
          details: formData.details.trim(),
          projectId: editorData.projectId
        };

        await this.taskService.createTask(input);
        vscode.window.showInformationMessage(`Task "${input.name}" created successfully!`);
      } else {
        // Update existing task
        if (!editorData.task) {
          throw new Error('Task data is required for editing');
        }

        const updates: UpdateTaskInput = {
          name: formData.name.trim(),
          details: formData.details.trim(),
          completed: formData.completed
        };

        await this.taskService.updateTask(editorData.task.id, updates);
        vscode.window.showInformationMessage(`Task "${updates.name}" updated successfully!`);
      }

      // Close the editor
      this.dispose();
    } catch (error) {
      const serviceError = ErrorUtils.createServiceError('TaskEditor', 'handleSave', error);
      ErrorHandler.handleError(serviceError, ErrorHandler.createContext('task_editor_save', {
        mode: editorData.mode,
        taskId: editorData.task?.id,
        projectId: editorData.projectId,
        taskName: formData.name
      }));
    }
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
   * Generate the webview HTML content
   */
  private getWebviewContent(data: TaskEditorData): string {
    const task = data.task;
    const isEdit = data.mode === 'edit';
    const title = isEdit ? `Edit Task: ${task?.name}` : `Create Task in ${data.projectName}`;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          ${WebviewUtils.getCommonCSS()}

          .project-info {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 20px;
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
          }
        </style>
      </head>
      <body>
        <div class="form-container">
          <h1>${title}</h1>

          ${data.projectName ? `
            <div class="project-info">
              <strong>Project:</strong> ${data.projectName}
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

        <script>
          ${WebviewUtils.getCommonJS()}

          // Initialize form
          function initializeForm(data) {
            setupCharCounter('taskName', 50, 'nameCounter');
            // No character counter for details (unlimited)
          }

          // Form submission
          document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();

            const formData = new FormData(e.target);
            const data = {
              name: formData.get('name'),
              details: formData.get('details') || '',
              completed: formData.has('completed')
            };

            // Validate
            let isValid = true;
            isValid &= validateField('taskName', (value) => value.trim().length > 0 && value.trim().length <= 50, 'Task name is required and must be 50 characters or less');
            // No validation for details (unlimited)

            if (isValid) {
              vscode.postMessage({ type: 'save', data });
            }
          });

          // Cancel button
          document.getElementById('cancelBtn').addEventListener('click', () => {
            vscode.postMessage({ type: 'cancel' });
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
