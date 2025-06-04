# Change Log

All notable changes to the Agentic Tools MCP Companion VS Code extension will be documented in this file.

## [1.0.0] - 2025-01-28

### 🚀 MAJOR: Enhanced Task Management UI with MCP Server v1.7.0 Compatibility

This release transforms the VS Code extension into a comprehensive visual task management interface with full support for the enhanced MCP server v1.7.0 features, while maintaining a clean user-focused experience.

### Added

#### 🎯 Enhanced Task Management Forms
- **Rich Task Creation**: Comprehensive forms with all enhanced metadata fields
- **Priority Selection**: 1-10 scale dropdown with descriptive labels (Lowest to Highest)
- **Complexity Estimation**: 1-10 scale dropdown with clear complexity descriptions
- **Status Management**: Visual status selection with emoji indicators (⏳🔄🚫✅)
- **Tag Management**: Comma-separated tag input with helper text and validation
- **Time Tracking**: Estimated and actual hours input with decimal precision support
- **Dependency Management**: Task dependency selection and validation (UI ready)

#### 🎨 Enhanced Visual Interface
- **Status Emojis**: ⏳ Pending, 🔄 In Progress, 🚫 Blocked, ✅ Done in task tree
- **Priority Badges**: 🔥 High Priority (8+), ⚡ Medium Priority (6+) visual indicators
- **Complexity Indicators**: 🧩 High Complexity (8+) badges for complex tasks
- **Time Display**: Estimated hours shown in task descriptions (e.g., "16h")
- **Rich Tooltips**: Comprehensive hover information with all task metadata

#### 📱 Responsive Form Design
- **Two-Column Layout**: Efficient use of space with responsive grid design
- **Mobile-Friendly**: Adaptive layout that works on different screen sizes
- **Helper Text**: Contextual help for all form fields
- **Validation**: Real-time form validation with error messages

### Enhanced

#### 🔧 Task Data Model (MCP v1.7.0 Compatible)
- **Dependencies**: `dependsOn?: string[]` - Task dependency management
- **Priority**: `priority?: number` (1-10 scale) - Task prioritization
- **Complexity**: `complexity?: number` (1-10 scale) - Complexity estimation
- **Status**: `status?: 'pending' | 'in-progress' | 'blocked' | 'done'` - Enhanced status workflow
- **Tags**: `tags?: string[]` - Categorization and filtering
- **Time Tracking**: `estimatedHours?: number` and `actualHours?: number`

#### 🎯 Task Tree Provider
- **Rich Tooltips**: Show priority, complexity, status, tags, time tracking, and dependencies
- **Visual Descriptions**: Display status emojis, priority badges, and time estimates
- **Enhanced Sorting**: Intelligent task ordering based on priority and status
- **Metadata Display**: Complete task information in hover tooltips

#### 📝 Task Service
- **Enhanced Creation**: Support for all new task metadata fields
- **Dependency Validation**: Verify task dependencies exist during creation
- **Rich Updates**: Handle all enhanced metadata in task updates
- **Backward Compatibility**: Seamless migration from existing task data

### Removed

#### 🧹 UI Cleanup for Better User Experience
- **Advanced MCP Commands**: Removed AI agent tools from UI (PRD parsing, task recommendations, etc.)
- **AdvancedTaskService**: Removed service and all related command implementations
- **Complex Menus**: Simplified menu structure focused on core user tasks
- **AI Tool Buttons**: Removed advanced AI features from user interface

**Rationale**: Advanced AI agent tools are now handled exclusively by the MCP server for AI agents, while the extension focuses on providing an excellent visual task management experience for human users.

### Technical Details

#### 🏗️ Architecture Improvements
- **Clean Separation**: Clear distinction between user UI and AI agent capabilities
- **Type Safety**: Enhanced TypeScript types for all new task metadata fields
- **Error Handling**: Comprehensive error handling for form validation and data operations
- **Performance**: Optimized data loading and caching for smooth user experience

#### 📊 Form Implementation
- **Responsive CSS Grid**: Two-column layout with mobile-first responsive design
- **Enhanced Validation**: Client-side validation for all form fields
- **User Experience**: Intuitive form flow with clear labels and helper text
- **Accessibility**: Proper form labels and keyboard navigation support

#### 🔄 Data Flow
- **User Input**: Enhanced forms capture rich task metadata
- **Local Storage**: Extension validates and stores data locally
- **MCP Integration**: AI agents access rich task data through MCP server
- **Real-time Sync**: Instant updates between extension and MCP server

### Migration and Compatibility

#### ✅ Backward Compatibility
- **Existing Tasks**: All existing tasks continue to work seamlessly
- **Data Migration**: Automatic support for tasks without enhanced metadata
- **Progressive Enhancement**: New features available without breaking existing workflows
- **MCP Server**: Compatible with both old and new MCP server versions

#### 🔄 Upgrade Path
- **Automatic**: No manual migration required
- **Gradual Adoption**: Can use new features incrementally
- **Mixed Data**: Old and new task formats work together
- **Zero Downtime**: Seamless upgrade experience

### Use Cases

#### 👥 Human Task Management
- **Visual Planning**: Rich forms for comprehensive task planning
- **Progress Tracking**: Visual status indicators and progress monitoring
- **Priority Management**: Clear prioritization with visual indicators
- **Time Estimation**: Accurate project planning with time tracking

#### 🤖 AI Agent Integration
- **Rich Metadata**: AI agents access comprehensive task information
- **Workflow Intelligence**: AI can make decisions based on priority, complexity, and dependencies
- **Research Integration**: AI agents can research tasks while users manage them visually
- **Seamless Collaboration**: Human planning with AI execution

---

## [0.0.3] - 2025-05-31

### Changed
- **VSCode Compatibility**: Downgraded VSCode engine requirement from `^1.100.0` to `^1.96.0` for improved compatibility with Windsurf and Cursor editors

---

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

---

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