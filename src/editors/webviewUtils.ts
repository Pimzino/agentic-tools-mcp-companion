import * as vscode from 'vscode';

/**
 * Utility functions for webview management
 */
export class WebviewUtils {
  /**
   * Get webview options with proper security settings
   */
  static getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
    return {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'src', 'editors', 'templates')]
    };
  }

  /**
   * Get common CSS for VS Code theming
   */
  static getCommonCSS(): string {
    return `
      :root {
        --vscode-font-family: var(--vscode-font-family);
        --vscode-font-size: var(--vscode-font-size);
        --vscode-font-weight: var(--vscode-font-weight);
      }

      body {
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        font-weight: var(--vscode-font-weight);
        color: var(--vscode-foreground);
        background-color: var(--vscode-editor-background);
        margin: 0;
        padding: 20px;
        line-height: 1.5;
      }

      .form-container {
        max-width: 800px;
        margin: 0 auto;
      }

      .form-group {
        margin-bottom: 20px;
      }

      label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: var(--vscode-foreground);
      }

      input[type="text"], textarea, select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--vscode-input-border);
        background-color: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border-radius: 2px;
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        box-sizing: border-box;
      }

      input[type="text"]:focus, textarea:focus, select:focus {
        outline: 1px solid var(--vscode-focusBorder);
        border-color: var(--vscode-focusBorder);
      }

      textarea {
        resize: vertical;
        min-height: 100px;
        font-family: var(--vscode-editor-font-family, monospace);
      }

      .textarea-large {
        min-height: 200px;
      }

      .checkbox-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      input[type="checkbox"] {
        width: auto;
        margin: 0;
      }

      .button-group {
        display: flex;
        gap: 12px;
        margin-top: 30px;
        justify-content: flex-end;
      }

      button {
        padding: 8px 16px;
        border: 1px solid var(--vscode-button-border, transparent);
        border-radius: 2px;
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        cursor: pointer;
        min-width: 80px;
      }

      .btn-primary {
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }

      .btn-primary:hover {
        background-color: var(--vscode-button-hoverBackground);
      }

      .btn-secondary {
        background-color: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
      }

      .btn-secondary:hover {
        background-color: var(--vscode-button-secondaryHoverBackground);
      }

      .error-message {
        color: var(--vscode-errorForeground);
        font-size: 0.9em;
        margin-top: 4px;
        display: none;
      }

      .form-group.error input,
      .form-group.error textarea {
        border-color: var(--vscode-inputValidation-errorBorder);
        background-color: var(--vscode-inputValidation-errorBackground);
      }

      .form-group.error .error-message {
        display: block;
      }

      .char-counter {
        font-size: 0.8em;
        color: var(--vscode-descriptionForeground);
        text-align: right;
        margin-top: 4px;
      }

      .char-counter.warning {
        color: var(--vscode-editorWarning-foreground);
      }

      .char-counter.error {
        color: var(--vscode-errorForeground);
      }

      .suggestions {
        margin-top: 4px;
        font-size: 0.9em;
        color: var(--vscode-descriptionForeground);
      }

      .suggestion-chip {
        display: inline-block;
        background-color: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        padding: 2px 8px;
        margin: 2px 4px 2px 0;
        border-radius: 12px;
        font-size: 0.8em;
        cursor: pointer;
        border: none;
      }

      .suggestion-chip:hover {
        opacity: 0.8;
      }
    `;
  }

  /**
   * Get common JavaScript for form handling
   */
  static getCommonJS(): string {
    return `
      const vscode = acquireVsCodeApi();

      // Character counter functionality
      function setupCharCounter(inputId, maxLength, counterId) {
        const input = document.getElementById(inputId);
        const counter = document.getElementById(counterId);

        function updateCounter() {
          const length = input.value.length;
          counter.textContent = length + '/' + maxLength;

          counter.className = 'char-counter';
          if (length > maxLength * 0.9) {
            counter.className += ' warning';
          }
          if (length > maxLength) {
            counter.className += ' error';
          }
        }

        input.addEventListener('input', updateCounter);
        updateCounter();
      }

      // Form validation
      function validateField(fieldId, validator, errorMessage) {
        const field = document.getElementById(fieldId);
        const group = field.closest('.form-group');
        const errorElement = group.querySelector('.error-message');

        const isValid = validator(field.value);

        if (isValid) {
          group.classList.remove('error');
        } else {
          group.classList.add('error');
          if (errorElement) {
            errorElement.textContent = errorMessage;
          }
        }

        return isValid;
      }

      // Suggestion chip functionality
      function setupSuggestionChips(inputId, suggestions) {
        const input = document.getElementById(inputId);
        const container = input.parentElement.querySelector('.suggestions');

        if (!container || !suggestions.length) return;

        suggestions.forEach(suggestion => {
          const chip = document.createElement('button');
          chip.className = 'suggestion-chip';
          chip.textContent = suggestion;
          chip.type = 'button';
          chip.addEventListener('click', () => {
            input.value = suggestion;
            input.focus();
          });
          container.appendChild(chip);
        });
      }

      // Message handling
      window.addEventListener('message', event => {
        const message = event.data;

        switch (message.type) {
          case 'initialize':
            initializeForm(message.data);
            break;
          case 'validation-error':
            showValidationError(message.error);
            break;
        }
      });

      function showValidationError(error) {
        // Show global error message
        let errorContainer = document.querySelector('.global-error');
        if (!errorContainer) {
          errorContainer = document.createElement('div');
          errorContainer.className = 'error-message global-error';
          errorContainer.style.display = 'block';
          errorContainer.style.marginBottom = '20px';
          document.querySelector('.form-container').prepend(errorContainer);
        }
        errorContainer.textContent = error;
      }
    `;
  }

  /**
   * Escape HTML to prevent XSS vulnerabilities
   */
  static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Create a webview panel with common setup
   */
  static createWebviewPanel(
    viewType: string,
    title: string,
    showOptions: vscode.ViewColumn | { viewColumn: vscode.ViewColumn; preserveFocus?: boolean },
    options: vscode.WebviewPanelOptions & vscode.WebviewOptions
  ): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(viewType, title, showOptions, options);

    // Set common icon
    panel.iconPath = {
      light: vscode.Uri.file('$(edit)'),
      dark: vscode.Uri.file('$(edit)')
    };

    return panel;
  }
}
