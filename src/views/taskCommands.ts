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
 * Search tasks
 */
export async function searchTasks(taskService: TaskService, taskTreeProvider: TaskTreeProvider): Promise<void> {
	try {
		const query = await vscode.window.showInputBox({
			prompt: 'Enter search query',
			placeHolder: 'Search for tasks...',
			validateInput: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Search query is required';
				}
				if (value.trim().length > 500) {
					return 'Search query must be 500 characters or less';
				}
				return null;
			}
		});

		if (!query) return;

		const results = await taskService.searchTasks({
			query: query.trim(),
			limit: 50
		});

		taskTreeProvider.setSearchResults(results);

		if (results.length === 0) {
			vscode.window.showInformationMessage('No tasks found matching your search.');
		} else {
			vscode.window.showInformationMessage(`Found ${results.length} matching tasks.`);
		}
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to search tasks: ${error}`);
	}
}

/**
 * Clear task search results
 */
export function clearTaskSearch(taskTreeProvider: TaskTreeProvider): void {
	taskTreeProvider.clearSearch();
	vscode.window.showInformationMessage('Search cleared.');
}


