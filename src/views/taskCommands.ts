import * as vscode from 'vscode';
import { TaskTreeItem, TaskTreeProvider } from '../providers/taskTreeProvider';
import { TaskService } from '../services/taskService';
import { Project, Task, Subtask } from '../models/index';
import { TaskEditor, TaskEditorData } from '../editors/taskEditor';
import { SubtaskEditor, SubtaskEditorData } from '../editors/subtaskEditor';

/**
 * Delete a project
 */
export async function deleteProject(taskService: TaskService, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'project') return;

	try {
		const project = item.data as Project;
		const confirmation = await vscode.window.showWarningMessage(
			`Are you sure you want to delete project "${project.name}"? This will also delete all tasks and subtasks in this project.`,
			{ modal: true },
			'Delete'
		);

		if (confirmation !== 'Delete') return;

		await taskService.deleteProject(project.id);
		vscode.window.showInformationMessage(`Project "${project.name}" deleted successfully!`);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to delete project: ${error}`);
	}
}

/**
 * Create a new task using the rich editor interface
 */
export async function createTask(taskService: TaskService, item: TaskTreeItem, extensionUri: vscode.Uri): Promise<void> {
	if (item.type !== 'project') return;

	try {
		const project = item.data as Project;
		const taskEditor = new TaskEditor(extensionUri, taskService);

		const editorData: TaskEditorData = {
			mode: 'create',
			projectId: project.id,
			projectName: project.name
		};

		await taskEditor.show(editorData);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to open task editor: ${error}`);
	}
}

/**
 * Edit a task using the rich editor interface
 */
export async function editTask(taskService: TaskService, item: TaskTreeItem, extensionUri: vscode.Uri): Promise<void> {
	if (item.type !== 'task') return;

	try {
		// Handle both regular tasks and search result tasks
		let task: Task;
		if ('projectName' in (item.data as any)) {
			// Search result task
			const searchResult = item.data as any;
			task = searchResult.task;
		} else {
			// Regular task
			task = item.data as Task;
		}

		const taskEditor = new TaskEditor(extensionUri, taskService);

		const editorData: TaskEditorData = {
			mode: 'edit',
			task: task
		};

		await taskEditor.show(editorData);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to open task editor: ${error}`);
	}
}

/**
 * Toggle task completion
 */
export async function toggleTask(taskService: TaskService, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'task') return;

	try {
		const task = item.data as Task;
		const newStatus = !task.completed;

		await taskService.updateTask(task.id, {
			completed: newStatus
		});

		const statusText = newStatus ? 'completed' : 'pending';
		vscode.window.showInformationMessage(`Task "${task.name}" marked as ${statusText}!`);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to update task: ${error}`);
	}
}

/**
 * Delete a task
 */
export async function deleteTask(taskService: TaskService, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'task') return;

	try {
		const task = item.data as Task;
		const confirmation = await vscode.window.showWarningMessage(
			`Are you sure you want to delete task "${task.name}"? This will also delete all subtasks.`,
			{ modal: true },
			'Delete'
		);

		if (confirmation !== 'Delete') return;

		await taskService.deleteTask(task.id);
		vscode.window.showInformationMessage(`Task "${task.name}" deleted successfully!`);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to delete task: ${error}`);
	}
}

/**
 * Create a new subtask using the rich editor interface
 */
export async function createSubtask(taskService: TaskService, item: TaskTreeItem, extensionUri: vscode.Uri): Promise<void> {
	if (item.type !== 'task') return;

	try {
		const task = item.data as Task;
		const subtaskEditor = new SubtaskEditor(extensionUri, taskService);

		const editorData: SubtaskEditorData = {
			mode: 'create',
			taskId: task.id,
			taskName: task.name
		};

		await subtaskEditor.show(editorData);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to open subtask editor: ${error}`);
	}
}

/**
 * Edit a subtask using the rich editor interface
 */
export async function editSubtask(taskService: TaskService, item: TaskTreeItem, extensionUri: vscode.Uri): Promise<void> {
	if (item.type !== 'subtask') return;

	try {
		const subtask = item.data as Subtask;
		const subtaskEditor = new SubtaskEditor(extensionUri, taskService);

		const editorData: SubtaskEditorData = {
			mode: 'edit',
			subtask: subtask
		};

		await subtaskEditor.show(editorData);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to open subtask editor: ${error}`);
	}
}

/**
 * Toggle subtask completion
 */
export async function toggleSubtask(taskService: TaskService, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'subtask') return;

	try {
		const subtask = item.data as Subtask;
		const newStatus = !subtask.completed;

		await taskService.updateSubtask(subtask.id, {
			completed: newStatus
		});

		const statusText = newStatus ? 'completed' : 'pending';
		vscode.window.showInformationMessage(`Subtask "${subtask.name}" marked as ${statusText}!`);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to update subtask: ${error}`);
	}
}

/**
 * Delete a subtask
 */
export async function deleteSubtask(taskService: TaskService, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'subtask') return;

	try {
		const subtask = item.data as Subtask;
		const confirmation = await vscode.window.showWarningMessage(
			`Are you sure you want to delete subtask "${subtask.name}"?`,
			{ modal: true },
			'Delete'
		);

		if (confirmation !== 'Delete') return;

		await taskService.deleteSubtask(subtask.id);
		vscode.window.showInformationMessage(`Subtask "${subtask.name}" deleted successfully!`);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to delete subtask: ${error}`);
	}
}

/**
 * Search tasks with real-time QuickPick interface
 */
export async function searchTasks(taskService: TaskService, taskTreeProvider: TaskTreeProvider, extensionUri: vscode.Uri): Promise<void> {
	try {
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

		// Handle real-time search as user types
		quickPick.onDidChangeValue(async (value) => {
			// Clear previous timeout
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}

			// Debounce search to avoid too many requests
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

				try {
					const results = await taskService.searchTasks({
						query: value.trim(),
						limit: 50
					});

					const items: vscode.QuickPickItem[] = [backItem];

					if (results.length === 0) {
						items.push({
							label: '$(search) No tasks found',
							description: `No results for "${value.trim()}"`,
							detail: 'Try different keywords'
						});
					} else {
						items.push(...results.map(result => ({
							label: `$(${result.task.completed ? 'check' : 'circle-outline'}) ${result.task.name}`,
							description: result.projectName,
							detail: `${result.task.details} (${Math.round(result.score * 100)}% match)`,
							task: result.task // Store task data for selection
						} as vscode.QuickPickItem & { task: Task })));
					}

					quickPick.items = items;
				} catch (error) {
					quickPick.items = [
						backItem,
						{
							label: '$(error) Search failed',
							description: `Error: ${error}`,
							detail: 'Please try again'
						}
					];
				}
			}, 300); // 300ms debounce
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
			quickPick.dispose();
		});

		quickPick.show();
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to open task search: ${error}`);
	}
}

/**
 * Clear task search results
 */
export function clearTaskSearch(taskTreeProvider: TaskTreeProvider): void {
	taskTreeProvider.clearSearch();
	vscode.window.showInformationMessage('Search cleared.');
}


