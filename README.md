# Agentic Tools MCP Companion

[![GitHub stars](https://img.shields.io/github/stars/Pimzino/agentic-tools-mcp-companion.svg)](https://github.com/Pimzino/agentic-tools-mcp-companion/stargazers)
[![GitHub license](https://img.shields.io/github/license/Pimzino/agentic-tools-mcp-companion.svg)](https://github.com/Pimzino/agentic-tools-mcp-companion/blob/main/LICENSE)
[![VS Code Version](https://img.shields.io/badge/VS%20Code-1.100.0%2B-blue.svg)](https://code.visualstudio.com/)
[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

A beautiful VS Code extension that provides a GUI interface for the [**agentic-tools-mcp**](https://github.com/Pimzino/agentic-tools-mcp) server functionality. This extension allows you to manage tasks and memories directly from VS Code with an intuitive, visual interface.

## 🔗 Ecosystem

This VS Code extension is part of a complete task and memory management ecosystem:

- **🖥️ VS Code Extension** (this repository) - Beautiful GUI interface for managing tasks and memories
- **⚡ [MCP Server](https://github.com/Pimzino/agentic-tools-mcp)** - Command-line tools and API for AI assistants

> **💡 Pro Tip**: Use both together for the ultimate productivity experience! The MCP server enables AI assistant integration while this extension provides a visual interface.

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

### Extension Installation
1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X)
3. Search for "Agentic Tools MCP Companion"
4. Click "Install"
5. Open a workspace folder
6. The "Agentic Tools" sidebar will appear in the Activity Bar

### Development Installation (for contributors only)
1. Clone or download this extension repository
2. Open the extension folder in VS Code
3. Run `npm install` to install dependencies
4. Press `F5` to run the extension in a new Extension Development Host window
5. Open a workspace folder in the new window

### Complete Setup (MCP Server + Extension)
For the full experience with AI assistant integration:

1. **Install MCP Server**: `npm install -g @pimzino/agentic-tools-mcp`
2. **Configure Claude Desktop** (or your preferred MCP client):
   ```json
   {
     "mcpServers": {
       "agentic-tools": {
         "command": "npx",
         "args": ["-y", "@pimzino/agentic-tools-mcp"]
       }
     }
   }
   ```
3. **Install this VS Code extension** (follow steps above)
4. **Enjoy seamless integration** between visual interface and AI assistants!

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

## Architecture & Data Synchronization

This extension is designed to work seamlessly with the [agentic-tools-mcp](https://github.com/Pimzino/agentic-tools-mcp) server:

### Data Compatibility
- **100% Compatible**: Uses identical `.agentic-tools-mcp` directory structure
- **Same File Formats**: JSON files are interchangeable between extension and MCP server
- **Atomic Operations**: Safe file operations prevent data corruption
- **Real-time Sync**: Changes made in VS Code are immediately available to AI assistants

### Workflow Integration
1. **Create/Edit in VS Code**: Use the beautiful GUI to manage tasks and memories
2. **AI Assistant Access**: AI assistants can read and modify the same data via MCP server
3. **Team Collaboration**: Share data via Git - both tools work with the same files
4. **Backup & Migration**: Simple file-based storage travels with your projects

### Benefits of Using Both Tools
- 🎯 **Visual Management**: Rich GUI for complex task hierarchies
- 🤖 **AI Integration**: Let AI assistants help with task planning and memory management
- 👥 **Team Collaboration**: Share task lists and memories via version control
- 📁 **Project-Specific**: Each workspace has its own isolated data
- 🔄 **Bidirectional Sync**: Changes in either tool are reflected in the other

## Related Projects

### ⚡ MCP Server
**[Agentic Tools MCP Server](https://github.com/Pimzino/agentic-tools-mcp)** - The companion MCP server that enables AI assistant integration.

**Key Features:**
- 🔧 **MCP Tools**: Complete set of task and memory management tools for AI assistants
- 📦 **NPM Package**: Easy installation with `npm install -g @pimzino/agentic-tools-mcp`
- 🤖 **AI Assistant Support**: Works with Claude Desktop, AugmentCode, and other MCP clients
- 🔄 **Data Compatibility**: 100% compatible with this VS Code extension

**Perfect for:**
- AI assistant users who want task and memory management
- Developers who prefer command-line tools
- Anyone who wants to integrate task management into AI workflows

## Development

To contribute to this extension:

1. Clone the repository
2. Run `npm install` to install dependencies
3. Press `F5` to run in development mode
4. Make changes and test in the Extension Development Host

### Development with MCP Server
For testing the complete ecosystem:

1. Clone both repositories:
   ```bash
   git clone https://github.com/Pimzino/agentic-tools-mcp.git
   git clone https://github.com/Pimzino/agentic-tools-mcp-companion.git
   ```
2. Set up the MCP server:
   ```bash
   cd agentic-tools-mcp
   npm install && npm run build
   ```
3. Set up the VS Code extension:
   ```bash
   cd agentic-tools-mcp-companion
   npm install
   ```
4. Test both tools with the same workspace data

## Release Notes

### 0.0.1

Initial release with comprehensive functionality:
- **Task Management**: Hierarchical tree view for projects, tasks, and subtasks
- **Memory Management**: JSON file-based storage with title/content architecture
- **Complete CRUD Operations**: Create, read, update, delete for all entities
- **Text-based Search**: Relevance-scored memory search functionality
- **Context Menus**: Right-click actions for all operations
- **Data Compatibility**: 100% compatible with agentic-tools-mcp server v1.5.0+

## Support

For issues and questions, please use the GitHub issue tracker.

### Getting Help
- 🐛 **Extension Issues**: Report VS Code extension issues at [this repository](https://github.com/Pimzino/agentic-tools-mcp-companion/issues)
- ⚡ **MCP Server Issues**: Report MCP server issues at [agentic-tools-mcp](https://github.com/Pimzino/agentic-tools-mcp/issues)
- 💡 **Feature Requests**: Use GitHub discussions for feature requests
- 📖 **Documentation**: Check the [MCP server documentation](https://github.com/Pimzino/agentic-tools-mcp#documentation) for detailed API reference

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Enjoy managing your tasks and memories with Agentic Tools MCP Companion!**

*Part of the [Agentic Tools ecosystem](https://github.com/Pimzino/agentic-tools-mcp) - bringing AI-powered task and memory management to your workflow.*

