import * as vscode from 'vscode';
import { Project, CreateProjectInput, UpdateProjectInput } from '../models/project';
import { TaskService } from '../services/taskService';
import { WebviewUtils } from './webviewUtils';
import { ProjectFormData, FormValidationResult } from '../types/formTypes';
import { ErrorHandler, ErrorUtils, ServiceError, ValidationError } from '../utils/errorHandler';

export interface ProjectEditorData {
  mode: 'create' | 'edit';
  project?: Project;
}

/**
 * Project editor using webview for better editing experience
 */
export class ProjectEditor {
  private panel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly taskService: TaskService
  ) {}

  /**
   * Show the project editor
   */
  public async show(data: ProjectEditorData): Promise<void> {
    // Create or reveal the webview panel
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = WebviewUtils.createWebviewPanel(
      'projectEditor',
      data.mode === 'create' ? 'Create Project' : 'Edit Project',
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
  private async handleSave(formData: ProjectFormData, editorData: ProjectEditorData): Promise<void> {
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
        // Create new project
        const input: CreateProjectInput = {
          name: formData.name.trim(),
          description: formData.description.trim()
        };

        await this.taskService.createProject(input);
        vscode.window.showInformationMessage(`Project "${input.name}" created successfully!`);
      } else {
        // Update existing project
        if (!editorData.project) {
          throw new Error('Project data is required for editing');
        }

        const updates: UpdateProjectInput = {};

        // Only include fields that have changed or are non-empty
        const trimmedName = formData.name.trim();
        const trimmedDescription = formData.description.trim();

        if (trimmedName !== editorData.project.name) {
          updates.name = trimmedName;
        }

        if (trimmedDescription !== editorData.project.description) {
          updates.description = trimmedDescription;
        }

        await this.taskService.updateProject(editorData.project.id, updates);
        vscode.window.showInformationMessage(`Project "${updates.name || editorData.project.name}" updated successfully!`);
      }

      // Close the editor
      this.dispose();
    } catch (error) {
      const serviceError = ErrorUtils.createServiceError('ProjectEditor', 'handleSave', error);
      ErrorHandler.handleError(serviceError, ErrorHandler.createContext('project_editor_save', {
        mode: editorData.mode,
        projectId: editorData.project?.id,
        projectName: formData.name
      }));
    }
  }

  /**
   * Validate form data
   */
  private validateFormData(data: ProjectFormData): FormValidationResult {
    if (!data.name || data.name.trim().length === 0) {
      return { isValid: false, error: 'Project name is required' };
    }

    if (data.name.trim().length > 100) {
      return { isValid: false, error: 'Project name must be 100 characters or less' };
    }

    if (data.description && data.description.trim().length > 500) {
      return { isValid: false, error: 'Project description must be 500 characters or less' };
    }

    return { isValid: true };
  }

  /**
   * Generate the webview HTML content
   */
  private getWebviewContent(data: ProjectEditorData): string {
    const project = data.project;
    const isEdit = data.mode === 'edit';
    const title = isEdit ? `Edit Project: ${WebviewUtils.escapeHtml(project?.name || '')}` : 'Create Project';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          ${WebviewUtils.getCommonCSS()}
        </style>
      </head>
      <body>
        <div class="form-container">
          <h1>${title}</h1>

          <form id="projectForm">
            <div class="form-group">
              <label for="projectName">Project Name *</label>
              <input
                type="text"
                id="projectName"
                name="name"
                placeholder="Enter project name"
                value="${WebviewUtils.escapeHtml(project?.name || '')}"
                maxlength="100"
                required
              />
              <div class="char-counter" id="nameCounter">0/100</div>
              <div class="error-message"></div>
            </div>

            <div class="form-group">
              <label for="projectDescription">Project Description</label>
              <textarea
                id="projectDescription"
                name="description"
                placeholder="Enter project description..."
                maxlength="500"
              >${WebviewUtils.escapeHtml(project?.description || '')}</textarea>
              <div class="char-counter" id="descriptionCounter">0/500</div>
              <div class="error-message"></div>
            </div>

            <div class="button-group">
              <button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>
              <button type="submit" class="btn-primary" id="saveBtn">
                ${isEdit ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>

        <script>
          ${WebviewUtils.getCommonJS()}

          // Initialize form
          function initializeForm(data) {
            setupCharCounter('projectName', 100, 'nameCounter');
            setupCharCounter('projectDescription', 500, 'descriptionCounter');
          }

          // Form submission
          document.getElementById('projectForm').addEventListener('submit', (e) => {
            e.preventDefault();

            const formData = new FormData(e.target);
            const data = {
              name: formData.get('name'),
              description: formData.get('description') || ''
            };

            // Validate
            let isValid = true;
            isValid &= validateField('projectName', (value) => value.trim().length > 0 && value.trim().length <= 100, 'Project name is required and must be 100 characters or less');
            isValid &= validateField('projectDescription', (value) => value.trim().length <= 500, 'Project description must be 500 characters or less');

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