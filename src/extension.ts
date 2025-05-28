import * as vscode from 'vscode';
import { TaskTreeProvider, TaskTreeItem } from './providers/taskTreeProvider';
import { MemoryTreeProvider, MemoryTreeItem } from './providers/memoryTreeProvider';
import { TaskService } from './services/taskService';
import { MemoryService } from './services/memoryService';
import { WorkspaceUtils } from './utils/index';
import { CreateProjectInput, Project } from './models/index';
import * as taskCommands from './views/taskCommands';
import * as memoryCommands from './views/memoryCommands';

/**
 * Extension activation function
 */
export function activate(context: vscode.ExtensionContext) {
	console.log('Agentic Tools MCP Companion is now active!');

	// Initialize services
	const taskService = TaskService.getInstance();
	const memoryService = MemoryService.getInstance();

	// Initialize memory service asynchronously
	memoryService.initialize().catch(error => {
		console.error('Failed to initialize memory service:', error);
		vscode.window.showWarningMessage('Memory functionality may be limited: ' + error.message);
	});

	// Create tree data providers
	const taskTreeProvider = new TaskTreeProvider();
	const memoryTreeProvider = new MemoryTreeProvider();

	// Register tree views
	const taskTreeView = vscode.window.createTreeView('agenticTasksView', {
		treeDataProvider: taskTreeProvider,
		showCollapseAll: true
	});

	const memoryTreeView = vscode.window.createTreeView('agenticMemoriesView', {
		treeDataProvider: memoryTreeProvider,
		showCollapseAll: true
	});

	// Handle tree item selection for memory view
	memoryTreeView.onDidChangeSelection(e => {
		if (e.selection.length > 0) {
			const item = e.selection[0];
			if (item.type === 'clear-search') {
				vscode.commands.executeCommand('agentic-tools.onMemoryTreeItemClick', item);
			}
		}
	});

	// Register commands
	const commands = [
		// Tree view commands
		vscode.commands.registerCommand('agentic-tools.refreshTasks', () => {
			taskTreeProvider.refresh();
		}),

		// Project commands
		vscode.commands.registerCommand('agentic-tools.createProject', async () => {
			await createProject(taskService);
		}),

		vscode.commands.registerCommand('agentic-tools.editProject', async (item: TaskTreeItem) => {
			await editProject(taskService, item);
		}),

		vscode.commands.registerCommand('agentic-tools.deleteProject', async (item: TaskTreeItem) => {
			await taskCommands.deleteProject(taskService, item);
		}),

		// Task commands
		vscode.commands.registerCommand('agentic-tools.createTask', async (item: TaskTreeItem) => {
			await taskCommands.createTask(taskService, item);
		}),

		vscode.commands.registerCommand('agentic-tools.editTask', async (item: TaskTreeItem) => {
			await taskCommands.editTask(taskService, item);
		}),

		vscode.commands.registerCommand('agentic-tools.toggleTask', async (item: TaskTreeItem) => {
			await taskCommands.toggleTask(taskService, item);
		}),

		vscode.commands.registerCommand('agentic-tools.deleteTask', async (item: TaskTreeItem) => {
			await taskCommands.deleteTask(taskService, item);
		}),

		// Subtask commands
		vscode.commands.registerCommand('agentic-tools.createSubtask', async (item: TaskTreeItem) => {
			await taskCommands.createSubtask(taskService, item);
		}),

		vscode.commands.registerCommand('agentic-tools.editSubtask', async (item: TaskTreeItem) => {
			await taskCommands.editSubtask(taskService, item);
		}),

		vscode.commands.registerCommand('agentic-tools.toggleSubtask', async (item: TaskTreeItem) => {
			await taskCommands.toggleSubtask(taskService, item);
		}),

		vscode.commands.registerCommand('agentic-tools.deleteSubtask', async (item: TaskTreeItem) => {
			await taskCommands.deleteSubtask(taskService, item);
		}),

		// Memory commands
		vscode.commands.registerCommand('agentic-tools.refreshMemories', () => {
			memoryTreeProvider.refresh();
		}),

		vscode.commands.registerCommand('agentic-tools.searchMemories', async () => {
			await memoryCommands.searchMemories(memoryService, memoryTreeProvider);
		}),

		vscode.commands.registerCommand('agentic-tools.createMemory', async () => {
			await memoryCommands.createMemory(memoryService);
		}),

		vscode.commands.registerCommand('agentic-tools.editMemory', async (item: MemoryTreeItem) => {
			await memoryCommands.editMemory(memoryService, item);
		}),

		vscode.commands.registerCommand('agentic-tools.deleteMemory', async (item: MemoryTreeItem) => {
			await memoryCommands.deleteMemory(memoryService, item);
		}),

		vscode.commands.registerCommand('agentic-tools.clearSearch', () => {
			memoryCommands.clearSearch(memoryTreeProvider);
		}),

		// Handle clicks on tree items
		vscode.commands.registerCommand('agentic-tools.onMemoryTreeItemClick', async (item: MemoryTreeItem) => {
			if (item.type === 'clear-search') {
				memoryCommands.clearSearch(memoryTreeProvider);
			}
		})
	];

	// Add all disposables to context
	context.subscriptions.push(
		taskTreeView,
		memoryTreeView,
		taskTreeProvider,
		memoryTreeProvider,
		taskService,
		memoryService,
		...commands
	);

	// Check workspace on activation
	checkWorkspace();
}

/**
 * Extension deactivation function
 */
export function deactivate() {
	// Cleanup is handled by disposables
}

// Command implementations

/**
 * Check workspace and show appropriate messages
 */
async function checkWorkspace(): Promise<void> {
	if (!WorkspaceUtils.getCurrentWorkspacePath()) {
		WorkspaceUtils.showNoWorkspaceError();
		return;
	}

	const validation = await TaskService.getInstance().validateWorkspace();
	if (!validation.isValid) {
		const hasPermissionError = validation.errors.some(error =>
			error.includes('permission') || error.includes('access')
		);

		if (hasPermissionError) {
			WorkspaceUtils.showPermissionError();
		} else {
			// Other errors are usually about missing structure, which will be created automatically
			console.log('Workspace validation warnings:', validation.errors);
		}
	}
}

/**
 * Create a new project
 */
async function createProject(taskService: TaskService): Promise<void> {
	try {
		const name = await vscode.window.showInputBox({
			prompt: 'Enter project name',
			placeHolder: 'My Project',
			validateInput: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Project name is required';
				}
				if (value.trim().length > 100) {
					return 'Project name must be 100 characters or less';
				}
				return null;
			}
		});

		if (!name) return;

		const description = await vscode.window.showInputBox({
			prompt: 'Enter project description',
			placeHolder: 'Project description...',
			validateInput: (value) => {
				if (value && value.length > 500) {
					return 'Description must be 500 characters or less';
				}
				return null;
			}
		});

		if (description === undefined) return;

		const input: CreateProjectInput = {
			name: name.trim(),
			description: description?.trim() || ''
		};

		await taskService.createProject(input);
		vscode.window.showInformationMessage(`Project "${name}" created successfully!`);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to create project: ${error}`);
	}
}

/**
 * Edit a project
 */
async function editProject(taskService: TaskService, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'project') return;

	try {
		const project = item.data as Project;

		const name = await vscode.window.showInputBox({
			prompt: 'Enter project name',
			value: project.name,
			validateInput: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Project name is required';
				}
				if (value.trim().length > 100) {
					return 'Project name must be 100 characters or less';
				}
				return null;
			}
		});

		if (!name) return;

		const description = await vscode.window.showInputBox({
			prompt: 'Enter project description',
			value: project.description,
			validateInput: (value) => {
				if (value && value.length > 500) {
					return 'Description must be 500 characters or less';
				}
				return null;
			}
		});

		if (description === undefined) return;

		await taskService.updateProject(project.id, {
			name: name.trim(),
			description: description.trim()
		});

		vscode.window.showInformationMessage(`Project "${name}" updated successfully!`);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to update project: ${error}`);
	}
}
