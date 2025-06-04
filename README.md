# Agentic Tools MCP Companion

[![GitHub stars](https://img.shields.io/github/stars/Pimzino/agentic-tools-mcp-companion.svg)](https://github.com/Pimzino/agentic-tools-mcp-companion/stargazers)
[![GitHub license](https://img.shields.io/github/license/Pimzino/agentic-tools-mcp-companion.svg)](https://github.com/Pimzino/agentic-tools-mcp-companion/blob/main/LICENSE)
[![VS Code Version](https://img.shields.io/badge/VS%20Code-1.96.0+-brightgreen.svg)](https://code.visualstudio.com/)
[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

A beautiful VS Code extension that provides a comprehensive GUI interface for the [**agentic-tools-mcp**](https://github.com/Pimzino/agentic-tools-mcp) server functionality. This extension allows you to manage tasks and memories directly from VS Code with an intuitive, visual interface featuring enhanced task metadata, priority management, and rich form editors.

## 🔗 Ecosystem

This VS Code extension is part of a complete task and memory management ecosystem:

- **🖥️ VS Code Extension** (this repository) - Beautiful GUI interface for managing tasks and memories
- **⚡ [MCP Server](https://github.com/Pimzino/agentic-tools-mcp)** - Command-line tools and API for AI assistants

> **💡 Pro Tip**: Use both together for the ultimate productivity experience! The MCP server enables AI assistant integration while this extension provides a visual interface.

## Features

### 🎯 Enhanced Task Management
- **Hierarchical Tree View**: Projects → Tasks → Subtasks with rich visual indicators
- **Enhanced Task Metadata**: Priority (1-10), complexity (1-10), status workflow, tags, and time tracking
- **Visual Status Indicators**: ⏳ Pending, 🔄 In Progress, 🚫 Blocked, ✅ Done with emoji display
- **Priority & Complexity Badges**: 🔥 High Priority (8+), ⚡ Medium Priority (6+), 🧩 High Complexity (8+)
- **Rich Form Editors**: Comprehensive forms with responsive design and validation
- **Time Tracking**: Estimated and actual hours with decimal precision
- **Tag Management**: Comma-separated tag input for categorization and filtering
- **Parent Selection & Management**: Choose parent projects/tasks during creation and move items between parents
- **Rich Tooltips**: Hover to see complete task information including all metadata
- **Real-time Updates**: Automatic refresh when data changes

### 📝 Rich Task Forms (MCP v1.7.0 Compatible)
- **Priority Selection**: 1-10 scale dropdown with descriptive labels (Lowest to Highest)
- **Complexity Estimation**: 1-10 scale dropdown with clear complexity descriptions
- **Status Management**: Visual status selection with emoji indicators
- **Tag Input**: Comma-separated tag management with helper text
- **Time Tracking**: Estimated and actual hours with decimal precision support
- **Responsive Design**: Two-column layout that adapts to different screen sizes
- **Real-time Validation**: Client-side validation with helpful error messages
- **Helper Text**: Contextual guidance for all form fields

### 🧠 Memory Management
- **Text-based Search**: Find memories using natural language queries with relevance scoring
- **Category Organization**: Organize memories by category with directory-based structure
- **Title + Content Architecture**: Separate title (50 chars max) and detailed content fields
- **JSON File Storage**: Human-readable JSON files for easy portability and version control

### 🔄 Data Compatibility & Enhanced Metadata
- **MCP v1.7.0 Compatible**: Full support for enhanced task metadata (priority, complexity, status, tags, time tracking)
- **Backward Compatible**: Works seamlessly with existing agentic-tools-mcp data
- **Progressive Enhancement**: New metadata fields are optional, existing tasks continue to work
- **Same File Formats**: Uses identical `.agentic-tools-mcp` directory structure
- **Atomic Operations**: Safe, atomic file operations prevent data corruption
- **Git-trackable**: All data can be committed alongside your project code

## Requirements

- VSCode 1.96.0 or higher
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

### Enhanced Task Management

#### Visual Task Tree
The extension displays your tasks with rich visual indicators:

```
📁 Project: Website Redesign
├── 🔥⚡ Design mockups (Priority: 8, Complexity: 6) [16h] ⏳
│   ├── ✅ Create wireframes
│   └── 🔄 Design high-fidelity mockups
├── 🧩 Backend API (Priority: 7, Complexity: 9) [32h] 🚫
└── ✅ Setup development environment (Priority: 9, Complexity: 3) [4h] ✅
```

**Visual Indicators:**
- 🔥 High Priority (8+), ⚡ Medium Priority (6+)
- 🧩 High Complexity (8+)
- ⏳ Pending, 🔄 In Progress, 🚫 Blocked, ✅ Done
- [16h] Estimated hours display

#### Task Operations
- **Create Project**: Click the "+" button in the Tasks view title
- **Create Enhanced Tasks**: Rich forms with priority, complexity, status, tags, and time tracking
- **Edit Items**: Right-click any item and select "Edit" for comprehensive metadata editing
- **Toggle Completion**: Right-click tasks/subtasks and select "Toggle Completion"
- **Delete Items**: Right-click and select "Delete" (with confirmation)
- **Refresh View**: Click the refresh button to reload data

### Parent Management & Moving Tasks

The extension provides powerful capabilities for organizing your tasks by allowing you to select parents during creation and move items between different parents:

#### Parent Selection During Creation
- **Creating Tasks**: When creating a new task, you can select which project it belongs to from a dropdown list
- **Creating Subtasks**: When creating a new subtask, you can choose both the target project and the specific task within that project using a two-step selection process

#### Moving Existing Items
- **Move Task to Project**: Right-click any task and select "Move to Project" to relocate it (along with all its subtasks) to a different project
- **Move Subtask to Task**: Right-click any subtask and select "Move to Task" to relocate it to a different task, even across projects

#### Smart Features
- **Cross-Project Moves**: Subtasks can be moved between tasks in different projects seamlessly
- **Batch Operations**: When moving a task, all its subtasks move with it automatically
- **Validation**: The system prevents invalid moves and provides clear feedback
- **Confirmation Dialogs**: Cross-project moves are confirmed to prevent accidental data reorganization
- **Automatic Refresh**: The tree view updates automatically after successful moves

#### Benefits
- **Flexible Organization**: Reorganize your task hierarchy as your project evolves
- **Easy Reclassification**: Move tasks between projects when priorities change
- **Efficient Workflow**: No need to delete and recreate tasks when structure changes
- **Data Integrity**: All relationships and completion status are preserved during moves

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
- 🔧 **Enhanced MCP Tools**: Complete set of task and memory management tools with rich metadata support
- 🤖 **Advanced AI Agent Tools**: PRD parsing, task recommendations, complexity analysis, progress inference, and research capabilities
- 📦 **NPM Package**: Easy installation with `npm install -g @pimzino/agentic-tools-mcp`
- 🤖 **AI Assistant Support**: Works with Claude Desktop, AugmentCode, and other MCP clients
- 🔄 **Data Compatibility**: 100% compatible with this VS Code extension

**Perfect Collaboration:**
- **Human Planning**: Use VS Code extension for visual task planning with rich metadata
- **AI Execution**: AI agents access comprehensive task data and use advanced tools
- **Seamless Integration**: Real-time sync between visual interface and AI capabilities
- **Enhanced Workflow**: Human creativity + AI intelligence for optimal productivity

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

