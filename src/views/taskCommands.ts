import * as vscode from 'vscode';
import { TaskTreeItem } from '../providers/taskTreeProvider';
import { TaskService } from '../services/taskService';
import { CreateTaskInput, CreateSubtaskInput, Task, Subtask } from '../models/index';

/**
 * Delete a project
 */
export async function deleteProject(taskService: TaskService, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'project') return;

	try {
		const project = item.data;
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
 * Create a new task
 */
export async function createTask(taskService: TaskService, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'project') return;

	try {
		const project = item.data;

		const name = await vscode.window.showInputBox({
			prompt: 'Enter task name',
			placeHolder: 'My Task',
			validateInput: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Task name is required';
				}
				if (value.trim().length > 100) {
					return 'Task name must be 100 characters or less';
				}
				return null;
			}
		});

		if (!name) return;

		const details = await vscode.window.showInputBox({
			prompt: 'Enter task details',
			placeHolder: 'Task details...',
			validateInput: (value) => {
				if (value && value.length > 1000) {
					return 'Details must be 1000 characters or less';
				}
				return null;
			}
		});

		if (details === undefined) return;

		const input: CreateTaskInput = {
			name: name.trim(),
			details: details?.trim() || '',
			projectId: project.id
		};

		await taskService.createTask(input);
		vscode.window.showInformationMessage(`Task "${name}" created successfully!`);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to create task: ${error}`);
	}
}

/**
 * Edit a task
 */
export async function editTask(taskService: TaskService, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'task') return;

	try {
		const task = item.data as Task;

		const name = await vscode.window.showInputBox({
			prompt: 'Enter task name',
			value: task.name,
			validateInput: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Task name is required';
				}
				if (value.trim().length > 100) {
					return 'Task name must be 100 characters or less';
				}
				return null;
			}
		});

		if (!name) return;

		const details = await vscode.window.showInputBox({
			prompt: 'Enter task details',
			value: task.details,
			validateInput: (value) => {
				if (value && value.length > 1000) {
					return 'Details must be 1000 characters or less';
				}
				return null;
			}
		});

		if (details === undefined) return;

		await taskService.updateTask(task.id, {
			name: name.trim(),
			details: details.trim()
		});

		vscode.window.showInformationMessage(`Task "${name}" updated successfully!`);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to update task: ${error}`);
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
 * Create a new subtask
 */
export async function createSubtask(taskService: TaskService, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'task') return;

	try {
		const task = item.data as Task;

		const name = await vscode.window.showInputBox({
			prompt: 'Enter subtask name',
			placeHolder: 'My Subtask',
			validateInput: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Subtask name is required';
				}
				if (value.trim().length > 100) {
					return 'Subtask name must be 100 characters or less';
				}
				return null;
			}
		});

		if (!name) return;

		const details = await vscode.window.showInputBox({
			prompt: 'Enter subtask details',
			placeHolder: 'Subtask details...',
			validateInput: (value) => {
				if (value && value.length > 1000) {
					return 'Details must be 1000 characters or less';
				}
				return null;
			}
		});

		if (details === undefined) return;

		const input: CreateSubtaskInput = {
			name: name.trim(),
			details: details?.trim() || '',
			taskId: task.id
		};

		await taskService.createSubtask(input);
		vscode.window.showInformationMessage(`Subtask "${name}" created successfully!`);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to create subtask: ${error}`);
	}
}

/**
 * Edit a subtask
 */
export async function editSubtask(taskService: TaskService, item: TaskTreeItem): Promise<void> {
	if (item.type !== 'subtask') return;

	try {
		const subtask = item.data as Subtask;

		const name = await vscode.window.showInputBox({
			prompt: 'Enter subtask name',
			value: subtask.name,
			validateInput: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Subtask name is required';
				}
				if (value.trim().length > 100) {
					return 'Subtask name must be 100 characters or less';
				}
				return null;
			}
		});

		if (!name) return;

		const details = await vscode.window.showInputBox({
			prompt: 'Enter subtask details',
			value: subtask.details,
			validateInput: (value) => {
				if (value && value.length > 1000) {
					return 'Details must be 1000 characters or less';
				}
				return null;
			}
		});

		if (details === undefined) return;

		await taskService.updateSubtask(subtask.id, {
			name: name.trim(),
			details: details.trim()
		});

		vscode.window.showInformationMessage(`Subtask "${name}" updated successfully!`);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to update subtask: ${error}`);
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
