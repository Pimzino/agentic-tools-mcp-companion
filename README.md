# Agentic Tools MCP Companion

A VSCode extension that provides a GUI interface for the [agentic-tools-mcp](https://github.com/Pimzino/agentic-tools-mcp) server functionality. This extension allows you to manage tasks and memories directly from VSCode with a beautiful, intuitive interface.

## Features

### 🎯 Task Management
- **Hierarchical Tree View**: Projects → Tasks → Subtasks
- **Complete CRUD Operations**: Create, read, update, and delete projects, tasks, and subtasks
- **Progress Tracking**: Visual completion status with icons
- **Context Menus**: Right-click actions for all operations
- **Real-time Updates**: Automatic refresh when data changes

### 🧠 Memory Management
- **Text-based Search**: Find memories using natural language queries with relevance scoring
- **Category Organization**: Organize memories by category with directory-based structure
- **Title + Content Architecture**: Separate title (50 chars max) and detailed content fields
- **JSON File Storage**: Human-readable JSON files for easy portability and version control

### 🔄 Data Compatibility
- **100% Compatible**: Works seamlessly with existing agentic-tools-mcp data
- **Same File Formats**: Uses identical `.agentic-tools-mcp` directory structure
- **Atomic Operations**: Safe, atomic file operations prevent data corruption
- **Git-trackable**: All data can be committed alongside your project code

## Requirements

- VSCode 1.100.0 or higher
- An open workspace folder
- Node.js 18+ (for dependencies)

## Installation

1. Clone or download this extension
2. Open the extension folder in VSCode
3. Press `F5` to run the extension in a new Extension Development Host window
4. Open a workspace folder in the new window
5. The "Agentic Tools" sidebar will appear in the Activity Bar

## Usage

### Getting Started

1. **Open a Workspace**: The extension requires an open workspace folder
2. **Access the Sidebar**: Click the "Agentic Tools" icon in the Activity Bar
3. **Create Your First Project**: Click the "+" button in the Tasks view
4. **Add Tasks and Subtasks**: Right-click on projects and tasks to add children

### Task Management

- **Create Project**: Click the "+" button in the Tasks view title
- **Edit Items**: Right-click any item and select "Edit"
- **Toggle Completion**: Right-click tasks/subtasks and select "Toggle Completion"
- **Delete Items**: Right-click and select "Delete" (with confirmation)
- **Refresh View**: Click the refresh button to reload data

### Data Storage

All data is stored in your workspace under `.agentic-tools-mcp/`:
```
your-workspace/
├── .agentic-tools-mcp/
│   ├── tasks/
│   │   └── tasks.json      # Projects, tasks, and subtasks
│   └── memories/           # Memory JSON files organized by category
│       ├── general/        # Default category
│       │   ├── memory1.json
│       │   └── memory2.json
│       └── user_preferences/
│           └── settings.json
├── src/
└── package.json
```

## Extension Settings

This extension contributes the following settings:

* `agentic-tools.autoRefresh`: Automatically refresh views when files change (default: true)

## Known Issues

- File watching uses polling instead of native file system events
- Large datasets may impact performance
- Memory search is case-sensitive and uses simple text matching

## Development

To contribute to this extension:

1. Clone the repository
2. Run `npm install` to install dependencies
3. Press `F5` to run in development mode
4. Make changes and test in the Extension Development Host

## Release Notes

### 0.0.1

Initial release with comprehensive functionality:
- **Task Management**: Hierarchical tree view for projects, tasks, and subtasks
- **Memory Management**: JSON file-based storage with title/content architecture
- **Complete CRUD Operations**: Create, read, update, delete for all entities
- **Text-based Search**: Relevance-scored memory search functionality
- **Context Menus**: Right-click actions for all operations
- **Data Compatibility**: 100% compatible with agentic-tools-mcp server v1.4.0+

---

**Enjoy managing your tasks with Agentic Tools MCP Companion!**
