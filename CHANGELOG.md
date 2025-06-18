# Change Log

All notable changes to the Agentic Tools MCP Companion VS Code extension will be documented in this file.

## [0.1.0] - 2025-06-19

### 🚀 MAJOR: Unified Task Model with Unlimited Hierarchy Support

This release brings the VS Code extension into alignment with MCP Server v1.8.0, implementing full support for the revolutionary unified task model with unlimited hierarchy depth while maintaining an intuitive visual interface.

### Added

#### ✨ Unlimited Hierarchy Visual Support
- **Unified Tree Display**: Single task tree supporting unlimited nesting depth (tasks → subtasks → sub-subtasks → etc.)
- **Level-Based Visual Indicators**: Different icons and indentation for each hierarchy level
- **Hierarchical Navigation**: Expandable/collapsible tree structure for unlimited depth exploration
- **Level Indicators**: Clear visual markers showing task hierarchy level (L0, L1, L2, etc.)
- **Parent-Child Visualization**: Clear parent-child relationships in tree structure

#### 🔄 Automatic Migration Integration
- **Seamless Upgrade**: Extension automatically works with migrated task data from MCP server
- **Legacy Compatibility**: Existing subtasks display correctly as migrated tasks with parentId
- **Migration Status**: Visual feedback during and after task model migration
- **Data Preservation**: All existing task relationships maintained through migration

#### 🛠️ Enhanced Task Operations
- **Unlimited Depth Creation**: Create tasks at any hierarchy level using parentId
- **Hierarchy Reorganization**: Move tasks between any hierarchy levels seamlessly
- **Recursive Operations**: Task operations (edit, delete) work across unlimited depth
- **Context-Aware Actions**: Actions adapt based on task hierarchy level and position

### Enhanced

#### 🌲 Task Tree Provider v2.0
- **Unified Model**: Single Task interface replaces separate task/subtask handling
- **Unlimited Depth Support**: Tree recursively builds hierarchy to any depth
- **Dynamic Icons**: Level-appropriate icons for different hierarchy depths
- **Enhanced Context**: Context values reflect hierarchy levels for proper menu display
- **Performance Optimized**: Efficient tree building for large hierarchies

#### 📊 Task Service Updates
- **Unified Operations**: All task operations work with unified Task model
- **Hierarchy Methods**: New methods for unlimited depth task management
- **Parent-Child Queries**: Efficient queries for hierarchical task relationships
- **Migration Support**: Built-in support for legacy subtask migration

#### 🎨 Visual Hierarchy Improvements
- **Level-Based Styling**: Different visual treatment for each hierarchy level
- **Indentation System**: Clear visual nesting with proper indentation
- **Icon Differentiation**: Top-level tasks use circle icons, child tasks use dot icons
- **Status Inheritance**: Visual status patterns flow through hierarchy levels

### Changed

#### 🔄 Unified Task Model Implementation
- **Single Task Interface**: Eliminated separate subtask types and interfaces
- **ParentId Support**: All task operations support parentId for hierarchy management
- **Level Calculation**: Automatic hierarchy level calculation and display
- **Context Menu Updates**: Updated context menus to work with unified model

#### 📱 UI/UX Improvements for Hierarchy
- **Enhanced Tooltips**: Show hierarchy path and level information
- **Improved Descriptions**: Display hierarchy context in task descriptions
- **Better Navigation**: Easier navigation through unlimited depth structures
- **Clear Breadcrumbs**: Visual hierarchy path indicators

### Migration & Compatibility

#### ✅ Seamless Backward Compatibility
- **Zero Breaking Changes**: All existing functionality preserved
- **Automatic Adaptation**: Extension automatically adapts to unified task model
- **Legacy Support**: Existing subtask context menus continue to work
- **Data Integrity**: All task relationships and metadata preserved

#### 🎯 Migration Features
- **Transparent Migration**: Extension handles migrated data transparently
- **Visual Consistency**: Migrated tasks display with consistent visual hierarchy
- **Operation Continuity**: All task operations continue to work during and after migration
- **Progressive Enhancement**: New unlimited depth features available immediately

### Technical Architecture

#### 🏗️ Core Implementation Updates
- **TaskTreeProvider**: Complete rewrite for unlimited depth support
- **TaskService**: Updated to handle unified Task model operations
- **Type Definitions**: Enhanced TypeScript types for unlimited hierarchy
- **Context Handling**: Improved context value system for hierarchy levels

#### 📊 Performance Optimizations
- **Efficient Tree Building**: Optimized recursive tree construction
- **Lazy Loading**: Child tasks loaded on demand for large hierarchies
- **Memory Management**: Efficient handling of large task hierarchies
- **Render Optimization**: Smart re-rendering for hierarchy changes

### Use Cases & Benefits

#### 🎯 Enhanced Workflow Support
- **Agile Development**: Epic → Feature → Story → Task → Subtask hierarchies
- **Project Management**: Project → Phase → Milestone → Deliverable → Action hierarchies
- **Research Projects**: Research → Topic → Question → Investigation → Finding hierarchies
- **Complex Planning**: Unlimited breakdown granularity for any project size

#### 👥 Improved User Experience
- **Flexible Organization**: Organize tasks exactly as needed without depth limitations
- **Visual Clarity**: Clear tree visualization of complex project structures
- **Intuitive Navigation**: Natural hierarchy exploration and management
- **Better Context**: Enhanced understanding of task relationships and dependencies

#### 🤖 AI Agent Integration
- **Rich Context**: AI agents access comprehensive hierarchy information
- **Unlimited Depth**: AI can create and manage tasks at any hierarchy level
- **Visual Feedback**: Human users see AI task organization in unified tree view
- **Seamless Collaboration**: Perfect integration between human visual management and AI automation

---

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