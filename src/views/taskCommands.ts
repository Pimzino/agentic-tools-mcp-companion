import * as vscode from 'vscode';
import { TaskTreeItem, TaskTreeProvider } from '../providers/taskTreeProvider';
import { TaskService } from '../services/taskService';
import { Project, Task, Subtask, MoveOperationResult } from '../models/index';
import { TaskEditor, TaskEditorData } from '../editors/taskEditor';
import { SubtaskEditor, SubtaskEditorData } from '../editors/subtaskEditor';
import { isTaskSearchResult } from '../types/formTypes';
import { ErrorHandler, ErrorUtils, ServiceError } from '../utils/errorHandler';
import { ConfigUtils, CancellableOperation } from '../utils/configUtils';

/**
 * Delete a project
 */
export async function deleteProject(taskService: TaskService, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'project') {return;}

	const project = item.data as Project;
	try {
		const confirmation = await vscode.window.showWarningMessage(
			`Are you sure you want to delete project "${project.name}"? This will also delete all tasks and subtasks in this project.`,
			{ modal: true },
			'Delete'
		);

		if (confirmation !== 'Delete') {return;}

		await taskService.deleteProject(project.id);
		vscode.window.showInformationMessage(`Project "${project.name}" deleted successfully!`);
	} catch (error) {
		const serviceError = ErrorUtils.createServiceError('TaskService', 'deleteProject', error);
		ErrorHandler.handleError(serviceError, ErrorHandler.createContext('delete_project', {
			projectId: project.id,
			projectName: project.name
		}));
	}
}

/**
 * Create a new task using the rich editor interface
 */
export async function createTask(taskService: TaskService, item: TaskTreeItem, extensionUri: vscode.Uri): Promise<void> {
	if (item.type !== 'project') {return;}

	const project = item.data as Project;
	try {
		const taskEditor = new TaskEditor(extensionUri, taskService);

		const editorData: TaskEditorData = {
			mode: 'create',
			projectId: project.id,
			projectName: project.name
		};

		await taskEditor.show(editorData);
	} catch (error) {
		const serviceError = ErrorUtils.createServiceError('TaskEditor', 'show', error);
		ErrorHandler.handleError(serviceError, ErrorHandler.createContext('create_task_editor', {
			projectId: project.id,
			projectName: project.name
		}));
	}
}

/**
 * Edit a task using the rich editor interface
 */
export async function editTask(taskService: TaskService, item: TaskTreeItem, extensionUri: vscode.Uri): Promise<void> {
	if (item.type !== 'task') {return;}

	// Handle both regular tasks and search result tasks
	let task: Task;
	if (isTaskSearchResult(item.data)) {
		// Search result task
		task = item.data.task;
	} else {
		// Regular task
		task = item.data as Task;
	}

	try {
		const taskEditor = new TaskEditor(extensionUri, taskService);

		const editorData: TaskEditorData = {
			mode: 'edit',
			task: task
		};

		await taskEditor.show(editorData);
	} catch (error) {
		const serviceError = ErrorUtils.createServiceError('TaskEditor', 'show', error);
		ErrorHandler.handleError(serviceError, ErrorHandler.createContext('edit_task_editor', {
			taskId: task.id,
			taskName: task.name
		}));
	}
}

/**
 * Toggle task completion
 */
export async function toggleTask(taskService: TaskService, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'task') {return;}

	const task = item.data as Task;
	const newStatus = !task.completed;

	try {
		await taskService.updateTask(task.id, {
			completed: newStatus
		});

		const statusText = newStatus ? 'completed' : 'pending';
		vscode.window.showInformationMessage(`Task "${task.name}" marked as ${statusText}!`);
	} catch (error) {
		const serviceError = ErrorUtils.createServiceError('TaskService', 'updateTask', error);
		ErrorHandler.handleError(serviceError, ErrorHandler.createContext('toggle_task', {
			taskId: task.id,
			taskName: task.name,
			newStatus
		}));
	}
}

/**
 * Delete a task
 */
export async function deleteTask(taskService: TaskService, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'task') {return;}

	const task = item.data as Task;
	try {
		const confirmation = await vscode.window.showWarningMessage(
			`Are you sure you want to delete task "${task.name}"? This will also delete all subtasks.`,
			{ modal: true },
			'Delete'
		);

		if (confirmation !== 'Delete') {return;}

		await taskService.deleteTask(task.id);
		vscode.window.showInformationMessage(`Task "${task.name}" deleted successfully!`);
	} catch (error) {
		const serviceError = ErrorUtils.createServiceError('TaskService', 'deleteTask', error);
		ErrorHandler.handleError(serviceError, ErrorHandler.createContext('delete_task', {
			taskId: task.id,
			taskName: task.name
		}));
	}
}

/**
 * Create a new subtask (child task) using the rich editor interface
 */
export async function createSubtask(taskService: TaskService, item: TaskTreeItem, extensionUri: vscode.Uri): Promise<void> {
	if (item.type !== 'task') {return;}

	const task = item.data as Task;
	try {
		const subtaskEditor = new SubtaskEditor(extensionUri, taskService);

		const editorData: SubtaskEditorData = {
			mode: 'create',
			taskId: task.id,
			taskName: task.name
		};

		await subtaskEditor.show(editorData);
	} catch (error) {
		const serviceError = ErrorUtils.createServiceError('SubtaskEditor', 'show', error);
		ErrorHandler.handleError(serviceError, ErrorHandler.createContext('create_subtask_editor', {
			taskId: task.id,
			taskName: task.name
		}));
	}
}

/**
 * Edit a subtask (child task) using the rich editor interface
 */
export async function editSubtask(taskService: TaskService, item: TaskTreeItem, extensionUri: vscode.Uri): Promise<void> {
	if (item.type !== 'task') {return;}

	const task = item.data as Task;
	try {
		// For unified model, use TaskEditor for all tasks regardless of hierarchy level
		const taskEditor = new TaskEditor(extensionUri, taskService);

		const editorData: TaskEditorData = {
			mode: 'edit',
			task: task
		};

		await taskEditor.show(editorData);
	} catch (error) {
		const serviceError = ErrorUtils.createServiceError('TaskEditor', 'show', error);
		ErrorHandler.handleError(serviceError, ErrorHandler.createContext('edit_subtask_editor', {
			taskId: task.id,
			taskName: task.name
		}));
	}
}

/**
 * Toggle subtask (child task) completion
 */
export async function toggleSubtask(taskService: TaskService, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'task') {return;}

	const task = item.data as Task;
	const newStatus = !task.completed;

	try {
		await taskService.updateTask(task.id, {
			completed: newStatus
		});

		const statusText = newStatus ? 'completed' : 'pending';
		vscode.window.showInformationMessage(`Task "${task.name}" marked as ${statusText}!`);
	} catch (error) {
		const serviceError = ErrorUtils.createServiceError('TaskService', 'updateTask', error);
		ErrorHandler.handleError(serviceError, ErrorHandler.createContext('toggle_subtask', {
			taskId: task.id,
			taskName: task.name,
			newStatus
		}));
	}
}

/**
 * Delete a subtask (child task)
 */
export async function deleteSubtask(taskService: TaskService, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'task') {return;}

	const task = item.data as Task;
	try {
		const confirmation = await vscode.window.showWarningMessage(
			`Are you sure you want to delete task "${task.name}"? This will also delete all child tasks.`,
			{ modal: true },
			'Delete'
		);

		if (confirmation !== 'Delete') {return;}

		await taskService.deleteTask(task.id);
		vscode.window.showInformationMessage(`Task "${task.name}" deleted successfully!`);
	} catch (error) {
		const serviceError = ErrorUtils.createServiceError('TaskService', 'deleteTask', error);
		ErrorHandler.handleError(serviceError, ErrorHandler.createContext('delete_subtask', {
			taskId: task.id,
			taskName: task.name
		}));
	}
}

/**
 * Search tasks with real-time QuickPick interface with cancellation support
 */
export async function searchTasks(taskService: TaskService, taskTreeProvider: TaskTreeProvider, extensionUri: vscode.Uri): Promise<void> {
	try {
		const config = ConfigUtils.getConfig();
		const quickPick = vscode.window.createQuickPick();
		quickPick.placeholder = 'Type to search tasks...';
		quickPick.matchOnDescription = true;
		quickPick.matchOnDetail = true;

		// Add back to tree view option
		const backItem: vscode.QuickPickItem = {
			label: '$(arrow-left) Back to projects',
			description: 'Return to project tree view',
			alwaysShow: true
		};

		quickPick.items = [backItem];

		let searchTimeout: NodeJS.Timeout | undefined;
		let currentSearchOperation: CancellableOperation | undefined;

		// Handle real-time search as user types
		quickPick.onDidChangeValue(async (value) => {
			// Cancel previous search operation
			if (currentSearchOperation) {
				currentSearchOperation.cancel();
			}

			// Clear previous timeout
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}

			// Debounce search using configured delay
			searchTimeout = setTimeout(async () => {
				if (value.trim().length === 0) {
					// Show only back option when empty
					quickPick.items = [backItem];
					return;
				}

				if (value.trim().length < 2) {
					// Require at least 2 characters
					quickPick.items = [
						backItem,
						{
							label: '$(info) Type at least 2 characters to search',
							description: '',
							detail: ''
						}
					];
					return;
				}

				// Create new search operation with cancellation support
				currentSearchOperation = new CancellableOperation();

				try {
					const results = await taskService.searchTasks({
						query: value.trim(),
						pageSize: config.search.pageSize,
						threshold: config.search.threshold,
						signal: currentSearchOperation.signal
					});

					// Check if this search was cancelled
					if (currentSearchOperation.isAborted) {
						return;
					}

					const items: vscode.QuickPickItem[] = [backItem];

					if (results.length === 0) {
						items.push({
							label: '$(search) No tasks found',
							description: `No results for "${value.trim()}"`,
							detail: 'Try different keywords'
						});
					} else {
						// Show pagination info if there are many results
						const totalResults = results.length;
						const displayedResults = results.slice(0, config.search.pageSize);

						if (totalResults > config.search.pageSize) {
							items.push({
								label: `$(info) Showing ${displayedResults.length} of ${totalResults} results`,
								description: 'Refine your search for better results',
								detail: ''
							});
						}

						items.push(...displayedResults.map(result => ({
							label: `$(${result.task.completed ? 'check' : 'circle-outline'}) ${result.task.name}`,
							description: result.projectName,
							detail: `${result.task.details} (${Math.round(result.score * 100)}% match)`,
							task: result.task // Store task data for selection
						} as vscode.QuickPickItem & { task: Task })));
					}

					quickPick.items = items;
				} catch (error) {
					// Don't show error if operation was just cancelled
					if (error instanceof Error && error.message.includes('cancelled')) {
						return;
					}

					const serviceError = ErrorUtils.createServiceError('TaskService', 'searchTasks', error);
					ErrorHandler.handleError(serviceError, ErrorHandler.createContext('search_tasks', { query: value.trim() }));
					quickPick.items = [
						backItem,
						{
							label: '$(error) Search failed',
							description: 'An error occurred while searching',
							detail: 'Please try again'
						}
					];
				}
			}, config.search.debounceMs);
		});

		// Handle item selection
		quickPick.onDidAccept(async () => {
			const selected = quickPick.selectedItems[0] as vscode.QuickPickItem & { task?: Task };

			if (selected.label.includes('Back to projects')) {
				// Return to normal tree view
				taskTreeProvider.clearSearch();
			} else if (selected.task) {
				// Open task in editor
				const taskEditor = new TaskEditor(extensionUri, taskService);
				await taskEditor.show({
					mode: 'edit',
					task: selected.task
				});
			}

			quickPick.dispose();
		});

		// Handle cancellation
		quickPick.onDidHide(() => {
			// Cancel any ongoing search operation
			if (currentSearchOperation) {
				currentSearchOperation.cancel();
			}
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}
			quickPick.dispose();
		});

		quickPick.show();
	} catch (error) {
		const serviceError = ErrorUtils.createServiceError('TaskService', 'searchTasks', error);
		ErrorHandler.handleError(serviceError, ErrorHandler.createContext('open_task_search'));
	}
}
/**
 * Clear task search results
 */
export function clearTaskSearch(taskTreeProvider: TaskTreeProvider): void {
	taskTreeProvider.clearSearch();
	vscode.window.showInformationMessage('Search cleared.');
}

/**
 * Move task to a different project
 */
export async function moveTaskToProject(taskService: TaskService, taskTreeProvider: TaskTreeProvider, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'task') {return;}

	const task = item.data as Task;
	try {
		// Get available projects
		const projectOptions = await taskService.getAvailableProjects();

		// Filter out current project
		const availableProjects = projectOptions.filter(p => p.id !== task.projectId);

		if (availableProjects.length === 0) {
			vscode.window.showInformationMessage('No other projects available to move this task to.');
			return;
		}

		// Show project selection
		const projectItems = availableProjects.map(project => ({
			label: project.name,
			description: `${project.taskCount} task(s)`,
			projectId: project.id
		}));

		const selectedProject = await vscode.window.showQuickPick(projectItems, {
			placeHolder: `Select project to move "${task.name}" to`,
			matchOnDescription: true
		});

		if (!selectedProject) {return;}

		// Validate the move
		const validation = await taskService.validateParentAssignment('task', task.id, selectedProject.projectId);

		if (!validation.isValid) {
			vscode.window.showErrorMessage(`Cannot move task: ${validation.errors.join(', ')}`);
			return;
		}

		// Show confirmation if required
		if (validation.requiresConfirmation) {
			const confirmationMessage = [
				`Move task "${task.name}" to project "${selectedProject.label}"?`,
				...validation.warnings
			].join('\n\n');

			const confirmation = await vscode.window.showWarningMessage(
				confirmationMessage,
				{ modal: true },
				'Move Task'
			);

			if (confirmation !== 'Move Task') {return;}
		}

		// Perform the move
		const result: MoveOperationResult = await taskService.moveTaskToProject(task.id, selectedProject.projectId);

		if (result.success) {
			// Refresh tree to show new structure
			taskTreeProvider.refreshAfterParentMove();

			// Show success message
			let message = `Task "${task.name}" moved to project "${selectedProject.label}" successfully!`;
			if (result.warnings && result.warnings.length > 0) {
				message += '\n\nWarnings:\n' + result.warnings.join('\n');
			}
			vscode.window.showInformationMessage(message);
		}
	} catch (error) {
		const serviceError = ErrorUtils.createServiceError('TaskService', 'moveTaskToProject', error);
		ErrorHandler.handleError(serviceError, ErrorHandler.createContext('move_task_to_project', {
			taskId: task.id,
			taskName: task.name
		}));
	}
}

/**
 * Move subtask (child task) to a different parent task
 */
export async function moveSubtaskToTask(taskService: TaskService, taskTreeProvider: TaskTreeProvider, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'task') {return;}

	const task = item.data as Task;
	try {
		// Get available tasks for moving this child task
		const taskOptions = await taskService.getAvailableTasksForSubtask(task.id);

		if (taskOptions.length === 0) {
			vscode.window.showInformationMessage('No other tasks available to move this task to.');
			return;
		}

		// Show task selection grouped by project
		const taskItems = taskOptions.map(availableTask => ({
			label: availableTask.name,
			description: `${availableTask.projectName} • ${availableTask.subtaskCount} child task(s)`,
			detail: availableTask.projectName,
			taskId: availableTask.id
		}));

		const selectedTask = await vscode.window.showQuickPick(taskItems, {
			placeHolder: `Select task to move "${task.name}" to`,
			matchOnDescription: true,
			matchOnDetail: true
		});

		if (!selectedTask) {return;}

		// Validate the move
		const validation = await taskService.validateParentAssignment('task', task.id, selectedTask.taskId);

		if (!validation.isValid) {
			vscode.window.showErrorMessage(`Cannot move task: ${validation.errors.join(', ')}`);
			return;
		}

		// Show confirmation if required
		if (validation.requiresConfirmation) {
			const confirmationMessage = [
				`Move task "${task.name}" to parent task "${selectedTask.label}"?`,
				...validation.warnings
			].join('\n\n');

			const confirmation = await vscode.window.showWarningMessage(
				confirmationMessage,
				{ modal: true },
				'Move Task'
			);

			if (confirmation !== 'Move Task') {return;}
		}

		// Perform the move by updating the parentId
		await taskService.updateTask(task.id, { parentId: selectedTask.taskId });
		const result = { success: true, warnings: [] };

		if (result.success) {
			// Refresh tree to show new structure
			taskTreeProvider.refreshAfterParentMove();

			// Show success message
			let message = `Task "${task.name}" moved to parent task "${selectedTask.label}" successfully!`;
			if (result.warnings && result.warnings.length > 0) {
				message += '\n\nWarnings:\n' + result.warnings.join('\n');
			}
			vscode.window.showInformationMessage(message);
		}
	} catch (error) {
		const serviceError = ErrorUtils.createServiceError('TaskService', 'updateTask', error);
		ErrorHandler.handleError(serviceError, ErrorHandler.createContext('move_task_to_parent', {
			taskId: task.id,
			taskName: task.name
		}));
	}
}



