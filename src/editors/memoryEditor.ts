import * as vscode from 'vscode';
import { Memory, CreateMemoryInput, UpdateMemoryInput, MEMORY_CONSTANTS } from '../models/memory';
import { MemoryService } from '../services/memoryService';
import { WebviewUtils } from './webviewUtils';

export interface MemoryEditorData {
  mode: 'create' | 'edit';
  memory?: Memory;
  existingCategories?: string[];
}

/**
 * Memory editor using webview for better editing experience
 */
export class MemoryEditor {
  private panel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly memoryService: MemoryService
  ) {}

  /**
   * Show the memory editor
   */
  public async show(data: MemoryEditorData): Promise<void> {
    // Get existing categories for suggestions
    if (!data.existingCategories) {
      try {
        const memories = await this.memoryService.getMemories();
        const categories = new Set<string>();
        memories.forEach(memory => {
          if (memory.category) {
            categories.add(memory.category);
          }
        });
        data.existingCategories = Array.from(categories).sort();
      } catch (error) {
        data.existingCategories = [];
      }
    }

    // Create or reveal the webview panel
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = WebviewUtils.createWebviewPanel(
      'memoryEditor',
      data.mode === 'create' ? 'Create Memory' : 'Edit Memory',
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
  private async handleSave(formData: any, editorData: MemoryEditorData): Promise<void> {
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
        // Create new memory
        const input: CreateMemoryInput = {
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: formData.category?.trim() || undefined,
          metadata: {}
        };

        await this.memoryService.createMemory(input);
        vscode.window.showInformationMessage(`Memory "${input.title}" created successfully!`);
      } else {
        // Update existing memory
        if (!editorData.memory) {
          throw new Error('Memory data is required for editing');
        }

        const updates: UpdateMemoryInput = {
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: formData.category?.trim() || undefined
        };

        await this.memoryService.updateMemory(editorData.memory.id, updates);
        vscode.window.showInformationMessage(`Memory "${updates.title}" updated successfully!`);
      }

      // Close the editor
      this.dispose();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save memory: ${error}`);
    }
  }

  /**
   * Validate form data
   */
  private validateFormData(data: any): { isValid: boolean; error?: string } {
    if (!data.title || data.title.trim().length === 0) {
      return { isValid: false, error: 'Memory title is required' };
    }

    if (data.title.trim().length > MEMORY_CONSTANTS.MAX_TITLE_LENGTH) {
      return { isValid: false, error: `Memory title must be ${MEMORY_CONSTANTS.MAX_TITLE_LENGTH} characters or less` };
    }

    if (!data.content || data.content.trim().length === 0) {
      return { isValid: false, error: 'Memory content is required' };
    }

    if (data.content.trim().length > 10000) {
      return { isValid: false, error: 'Memory content must be 10,000 characters or less' };
    }

    if (data.category && data.category.length > 100) {
      return { isValid: false, error: 'Category must be 100 characters or less' };
    }

    return { isValid: true };
  }

  /**
   * Generate the webview HTML content
   */
  private getWebviewContent(data: MemoryEditorData): string {
    const memory = data.memory;
    const isEdit = data.mode === 'edit';
    const title = isEdit ? `Edit Memory: ${memory?.title}` : 'Create Memory';
    const categories = data.existingCategories || [];

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          ${WebviewUtils.getCommonCSS()}
          
          .memory-info {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 20px;
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
          }
          
          .category-suggestions {
            margin-top: 8px;
          }
          
          .category-suggestions-label {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
          }
        </style>
      </head>
      <body>
        <div class="form-container">
          <h1>${title}</h1>
          
          ${isEdit && memory ? `
            <div class="memory-info">
              <strong>Created:</strong> ${new Date(memory.createdAt).toLocaleString()}<br>
              <strong>Last Updated:</strong> ${new Date(memory.updatedAt).toLocaleString()}
            </div>
          ` : ''}
          
          <form id="memoryForm">
            <div class="form-group">
              <label for="memoryTitle">Memory Title *</label>
              <input 
                type="text" 
                id="memoryTitle" 
                name="title" 
                placeholder="Short descriptive title"
                value="${memory?.title || ''}"
                maxlength="${MEMORY_CONSTANTS.MAX_TITLE_LENGTH}"
                required
              />
              <div class="char-counter" id="titleCounter">0/${MEMORY_CONSTANTS.MAX_TITLE_LENGTH}</div>
              <div class="error-message"></div>
            </div>
            
            <div class="form-group">
              <label for="memoryContent">Memory Content *</label>
              <textarea 
                id="memoryContent" 
                name="content" 
                class="textarea-large"
                placeholder="Enter detailed memory content..."
                maxlength="10000"
                required
              >${memory?.content || ''}</textarea>
              <div class="char-counter" id="contentCounter">0/10000</div>
              <div class="error-message"></div>
            </div>
            
            <div class="form-group">
              <label for="memoryCategory">Category (optional)</label>
              <input 
                type="text" 
                id="memoryCategory" 
                name="category" 
                placeholder="e.g., user_preferences, project_context"
                value="${memory?.category || ''}"
                maxlength="100"
              />
              <div class="char-counter" id="categoryCounter">0/100</div>
              ${categories.length > 0 ? `
                <div class="category-suggestions">
                  <div class="category-suggestions-label">Existing categories:</div>
                  <div class="suggestions" id="categorySuggestions"></div>
                </div>
              ` : ''}
              <div class="error-message"></div>
            </div>
            
            <div class="button-group">
              <button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>
              <button type="submit" class="btn-primary" id="saveBtn">
                ${isEdit ? 'Update Memory' : 'Create Memory'}
              </button>
            </div>
          </form>
        </div>
        
        <script>
          ${WebviewUtils.getCommonJS()}
          
          // Initialize form
          function initializeForm(data) {
            setupCharCounter('memoryTitle', ${MEMORY_CONSTANTS.MAX_TITLE_LENGTH}, 'titleCounter');
            setupCharCounter('memoryContent', 10000, 'contentCounter');
            setupCharCounter('memoryCategory', 100, 'categoryCounter');
            
            // Setup category suggestions
            const categories = ${JSON.stringify(categories)};
            if (categories.length > 0) {
              setupSuggestionChips('memoryCategory', categories);
            }
          }
          
          // Form submission
          document.getElementById('memoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = {
              title: formData.get('title'),
              content: formData.get('content'),
              category: formData.get('category') || ''
            };
            
            // Validate
            let isValid = true;
            isValid &= validateField('memoryTitle', (value) => value.trim().length > 0 && value.trim().length <= ${MEMORY_CONSTANTS.MAX_TITLE_LENGTH}, 'Memory title is required and must be ${MEMORY_CONSTANTS.MAX_TITLE_LENGTH} characters or less');
            isValid &= validateField('memoryContent', (value) => value.trim().length > 0 && value.trim().length <= 10000, 'Memory content is required and must be 10,000 characters or less');
            isValid &= validateField('memoryCategory', (value) => !value || value.length <= 100, 'Category must be 100 characters or less');
            
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
