import * as vscode from 'vscode';
import { TaskTreeProvider, TaskTreeItem } from './providers/taskTreeProvider';
import { MemoryTreeProvider, MemoryTreeItem } from './providers/memoryTreeProvider';
import { TaskService } from './services/taskService';
import { MemoryService } from './services/memoryService';
import { WorkspaceUtils } from './utils/index';
import { CreateProjectInput, Project } from './models/index';
import * as taskCommands from './views/taskCommands';
import * as memoryCommands from './views/memoryCommands';
import { ErrorHandler, ErrorUtils, ServiceError, ValidationError } from './utils/errorHandler';
import { ProjectEditor } from './editors/projectEditor';

/**
 * Extension activation function
 */
export function activate(context: vscode.ExtensionContext) {

	// Initialize services
	const taskService = TaskService.getInstance();
	const memoryService = MemoryService.getInstance();

	// Initialize memory service asynchronously
	memoryService.initialize().catch(error => {
		const serviceError = ErrorUtils.createServiceError('MemoryService', 'initialize', error);
		ErrorHandler.handleError(serviceError, ErrorHandler.createContext('service_initialization'));
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
			if (item.type === 'search-prompt') {
				vscode.commands.executeCommand('agentic-tools.searchMemories');
			} else if (item.type === 'clear-search') {
				vscode.commands.executeCommand('agentic-tools.onMemoryTreeItemClick', item);
			} else if (item.type === 'memory') {
				vscode.commands.executeCommand('agentic-tools.editMemory', item);
			}
		}
	});

	// Handle tree item selection for task view
	taskTreeView.onDidChangeSelection(e => {
		if (e.selection.length > 0) {
			const item = e.selection[0];
			if (item.type === 'search-prompt') {
				vscode.commands.executeCommand('agentic-tools.searchTasks');
			} else if (item.type === 'clear-search') {
				vscode.commands.executeCommand('agentic-tools.onTaskTreeItemClick', item);
			} else if (item.type === 'task') {
				// For unified model, all tasks (including child tasks) use editTask
				vscode.commands.executeCommand('agentic-tools.editTask', item);
			}
		}
	});

	// Register commands
	const commands = [
		// Tree view commands
		vscode.commands.registerCommand('agentic-tools.refreshTasks', () => {
			taskTreeProvider.refresh();
		}),

		vscode.commands.registerCommand('agentic-tools.searchTasks', async () => {
			await taskCommands.searchTasks(taskService, taskTreeProvider, context.extensionUri);
		}),

		vscode.commands.registerCommand('agentic-tools.clearTaskSearch', () => {
			taskCommands.clearTaskSearch(taskTreeProvider);
		}),

		// Project commands
		vscode.commands.registerCommand('agentic-tools.createProject', async () => {
			await createProject(taskService, context.extensionUri);
		}),

		vscode.commands.registerCommand('agentic-tools.editProject', async (item: TaskTreeItem) => {
			await editProject(taskService, item, context.extensionUri);
		}),

		vscode.commands.registerCommand('agentic-tools.deleteProject', async (item: TaskTreeItem) => {
			await taskCommands.deleteProject(taskService, item);
		}),

		// Task commands
		vscode.commands.registerCommand('agentic-tools.createTask', async (item: TaskTreeItem) => {
			await taskCommands.createTask(taskService, item, context.extensionUri);
		}),

		vscode.commands.registerCommand('agentic-tools.editTask', async (item: TaskTreeItem) => {
			await taskCommands.editTask(taskService, item, context.extensionUri);
		}),

		vscode.commands.registerCommand('agentic-tools.toggleTask', async (item: TaskTreeItem) => {
			await taskCommands.toggleTask(taskService, item);
		}),

		vscode.commands.registerCommand('agentic-tools.deleteTask', async (item: TaskTreeItem) => {
			await taskCommands.deleteTask(taskService, item);
		}),

		// Subtask commands
		vscode.commands.registerCommand('agentic-tools.createSubtask', async (item: TaskTreeItem) => {
			await taskCommands.createSubtask(taskService, item, context.extensionUri);
		}),

		vscode.commands.registerCommand('agentic-tools.editSubtask', async (item: TaskTreeItem) => {
			await taskCommands.editSubtask(taskService, item, context.extensionUri);
		}),

		vscode.commands.registerCommand('agentic-tools.toggleSubtask', async (item: TaskTreeItem) => {
			await taskCommands.toggleSubtask(taskService, item);
		}),

		vscode.commands.registerCommand('agentic-tools.deleteSubtask', async (item: TaskTreeItem) => {
			await taskCommands.deleteSubtask(taskService, item);
		}),

		// Parent move commands
		vscode.commands.registerCommand('agentic-tools.moveTaskToProject', async (item: TaskTreeItem) => {
			await taskCommands.moveTaskToProject(taskService, taskTreeProvider, item);
		}),

		vscode.commands.registerCommand('agentic-tools.moveSubtaskToTask', async (item: TaskTreeItem) => {
			await taskCommands.moveSubtaskToTask(taskService, taskTreeProvider, item);
		}),

		// Memory commands
		vscode.commands.registerCommand('agentic-tools.refreshMemories', () => {
			memoryTreeProvider.refresh();
		}),

		vscode.commands.registerCommand('agentic-tools.searchMemories', async () => {
			await memoryCommands.searchMemories(memoryService, memoryTreeProvider, context.extensionUri);
		}),

		vscode.commands.registerCommand('agentic-tools.createMemory', async () => {
			await memoryCommands.createMemory(memoryService, context.extensionUri);
		}),

		vscode.commands.registerCommand('agentic-tools.editMemory', async (item: MemoryTreeItem) => {
			await memoryCommands.editMemory(memoryService, item, context.extensionUri);
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
		}),

		vscode.commands.registerCommand('agentic-tools.onTaskTreeItemClick', async (item: TaskTreeItem) => {
			if (item.type === 'clear-search') {
				taskCommands.clearTaskSearch(taskTreeProvider);
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
			// Log at debug level only - these are expected warnings
		}
	}
}

/**
 * Create a new project
 */
async function createProject(taskService: TaskService, extensionUri: vscode.Uri): Promise<void> {
	try {
		const projectEditor = new ProjectEditor(extensionUri, taskService);
		await projectEditor.show({ mode: 'create' });
	} catch (error) {
		const serviceError = ErrorUtils.createServiceError('ProjectEditor', 'createProject', error);
		ErrorHandler.handleError(serviceError, ErrorHandler.createContext('create_project'));
	}
}

/**
 * Edit a project
 */
async function editProject(taskService: TaskService, item: TaskTreeItem, extensionUri: vscode.Uri): Promise<void> {
	if (item.type !== 'project') {return;}

	try {
		const project = item.data as Project;
		const projectEditor = new ProjectEditor(extensionUri, taskService);
		await projectEditor.show({
			mode: 'edit',
			project: project
		});
	} catch (error) {
		const serviceError = ErrorUtils.createServiceError('ProjectEditor', 'editProject', error);
		ErrorHandler.handleError(serviceError, ErrorHandler.createContext('edit_project', {
			projectId: (item.data as Project).id,
			projectName: (item.data as Project).name
		}));
	}
}
