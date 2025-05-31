# Change Log

All notable changes to the "agentic-tools-mcp-companion" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.0.2] - 2025-05-31

### Added
- **Parent Selection During Creation**: Tasks can now be created with project selection; subtasks can be created with project→task selection
- **Parent Reassignment System**: Complete task and subtask moving capabilities via context menu commands
- **Move Task to Project Command**: Right-click context menu option to move tasks between projects (includes all subtasks)
- **Move Subtask to Task Command**: Right-click context menu option to move subtasks between tasks, including cross-project moves
- **Enhanced Task Editor**: Project selection dropdown for changing task parent during editing
- **Enhanced Subtask Editor**: Two-step parent selection (project→task) for comprehensive subtask reassignment
- **Cross-Project Move Validation**: Confirmation dialogs for cross-project operations to prevent accidental reorganization
- **Automatic Tree Refresh**: Tree view automatically updates after successful move operations
- **Parent Selection Type System**: New `src/models/parentSelection.ts` with comprehensive types for parent management operations

### Changed
- **TaskService Enhancement**: Added 12 new methods for parent selection and reassignment operations
- **Tree Provider Integration**: Enhanced tree providers to handle automatic refresh after move operations
- **Editor UI Improvements**: Updated task and subtask editors with parent selection capabilities
- **Context Menu Structure**: Added new "move" group for reorganization commands

### Technical Improvements
- **Type Safety**: Complete type system for parent selection operations with validation
- **Data Integrity**: All move operations preserve task/subtask relationships and completion status
- **Error Handling**: Comprehensive validation prevents invalid parent assignments
- **Performance**: Efficient tree refresh mechanism for smooth user experience

## [0.0.1] - 2025-05-31

### Added
- Initial release with comprehensive task and memory management functionality
- Hierarchical tree view for projects, tasks, and subtasks
- Memory management with JSON file-based storage and title/content architecture
- Complete CRUD operations for all entities (create, read, update, delete)
- Text-based search with relevance scoring for memories
- Context menus with right-click actions for all operations
- Real-time updates and automatic refresh capabilities
- 100% compatibility with agentic-tools-mcp server v1.5.0+