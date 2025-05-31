import * as vscode from 'vscode';
import { Subtask, CreateSubtaskInput, UpdateSubtaskInput } from '../models/subtask';
import { TaskService } from '../services/taskService';
import { WebviewUtils } from './webviewUtils';
import { SubtaskFormData, FormValidationResult } from '../types/formTypes';
import { ErrorHandler, ErrorUtils, ServiceError, ValidationError } from '../utils/errorHandler';

export interface SubtaskEditorData {
  mode: 'create' | 'edit';
  subtask?: Subtask;
  taskId?: string;
  taskName?: string;
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
   * Show the subtask editor
   */
  public async show(data: SubtaskEditorData): Promise<void> {
    // Create or reveal the webview panel
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = WebviewUtils.createWebviewPanel(
      'subtaskEditor',
      data.mode === 'create' ? 'Create Subtask' : 'Edit Subtask',
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
  private async handleSave(formData: SubtaskFormData, editorData: SubtaskEditorData): Promise<void> {
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
        // Create new subtask
        if (!editorData.taskId) {
          throw new Error('Task ID is required for creating subtasks');
        }

        const input: CreateSubtaskInput = {
          name: formData.name.trim(),
          details: formData.details.trim(),
          taskId: editorData.taskId
        };

        await this.taskService.createSubtask(input);
        vscode.window.showInformationMessage(`Subtask "${input.name}" created successfully!`);
      } else {
        // Update existing subtask
        if (!editorData.subtask) {
          throw new Error('Subtask data is required for editing');
        }

        const updates: UpdateSubtaskInput = {
          name: formData.name.trim(),
          details: formData.details.trim(),
          completed: formData.completed
        };

        await this.taskService.updateSubtask(editorData.subtask.id, updates);
        vscode.window.showInformationMessage(`Subtask "${updates.name}" updated successfully!`);
      }

      // Close the editor
      this.dispose();
    } catch (error) {
      const serviceError = ErrorUtils.createServiceError('SubtaskEditor', 'handleSave', error);
      ErrorHandler.handleError(serviceError, ErrorHandler.createContext('subtask_editor_save', {
        mode: editorData.mode,
        subtaskId: editorData.subtask?.id,
        taskId: editorData.taskId,
        subtaskName: formData.name
      }));
    }
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
   * Generate the webview HTML content
   */
  private getWebviewContent(data: SubtaskEditorData): string {
    const subtask = data.subtask;
    const isEdit = data.mode === 'edit';
    const title = isEdit ? `Edit Subtask: ${subtask?.name}` : `Create Subtask in ${data.taskName}`;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          ${WebviewUtils.getCommonCSS()}

          .task-info {
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

          ${data.taskName ? `
            <div class="task-info">
              <strong>Parent Task:</strong> ${data.taskName}
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

        <script>
          ${WebviewUtils.getCommonJS()}

          // Initialize form
          function initializeForm(data) {
            setupCharCounter('subtaskName', 50, 'nameCounter');
            // No character counter for details (unlimited)
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

            // Validate
            let isValid = true;
            isValid &= validateField('subtaskName', (value) => value.trim().length > 0 && value.trim().length <= 50, 'Subtask name is required and must be 50 characters or less');
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
