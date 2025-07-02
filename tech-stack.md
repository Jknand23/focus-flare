# FocusFlare Tech Stack Decisions & Best Practices
*"Illuminate your focus. Navigate your day."*

## Overview
This document outlines the final technology stack decisions for FocusFlare, a privacy-first Windows desktop application for intelligent activity tracking and focus management. It includes comprehensive best practices, limitations, conventions, and common pitfalls for each technology.

## 🎯 Core Requirements Met
- ✅ **Privacy-First**: All processing happens locally
- ✅ **Windows Optimized**: Native Windows desktop experience  
- ✅ **Local AI**: No cloud dependencies for AI processing
- ✅ **Modular**: Scalable and maintainable architecture (files <500 lines)
- ✅ **Non-Intrusive**: Lightweight background operation

---

## 📋 Final Tech Stack Decisions & Best Practices

### 1. **Desktop Application Framework**
**Decision: Electron** 
- **Why**: Mature ecosystem, excellent Windows integration, familiar web technologies
- **Version**: Latest stable (28+)

#### **✅ Best Practices**
- **Process Isolation**: Keep main process lightweight, handle heavy tasks in renderer
- **IPC Optimization**: Use `ipcRenderer.invoke()` for async operations, avoid synchronous IPC
- **Memory Management**: Implement proper cleanup for unused windows and event listeners
- **Security**: Enable `contextIsolation: true` and `nodeIntegration: false` in renderer
- **Preload Scripts**: Use preload scripts to safely expose APIs to renderer process
- **Window Management**: Implement proper window state persistence and restoration

#### **⚠️ Limitations & Considerations**
- **Bundle Size**: Chromium adds ~120MB to final package size
- **Memory Usage**: Baseline ~50MB RAM consumption before app logic
- **Security Surface**: Larger attack surface than native apps
- **Auto-Updates**: Requires code signing certificates for production distribution
- **Performance**: Slower startup time compared to native applications (~2-3s cold start)

#### **🚨 Common Pitfalls**
- **Security Vulnerabilities**: Enabling `nodeIntegration` in renderer without proper sandboxing
- **Memory Leaks**: Not removing event listeners when components unmount
- **IPC Deadlocks**: Using synchronous IPC calls in main process
- **Context Isolation**: Directly accessing Node.js APIs from renderer without preload
- **Auto-Updater Issues**: Not handling update failures gracefully

### 2. **Frontend Framework**
**Decision: React + TypeScript**
- **Why**: Perfect for complex dashboard interfaces, excellent tooling, strong typing
- **Version**: React 18+, TypeScript 5+

#### **✅ Best Practices**
- **Functional Components**: Use function declarations for pure components, avoid classes
- **Custom Hooks**: Extract complex logic into reusable custom hooks
- **TypeScript Strict Mode**: Enable strict mode for better type safety
- **Component Organization**: Max 500 lines per file, split large components
- **Props Interface**: Define explicit interfaces for all component props
- **Error Boundaries**: Implement error boundaries for graceful failure handling
- **Memoization**: Use `React.memo()` and `useMemo()` for expensive computations only
- **JSDoc Comments**: Document all functions with purpose and parameters

#### **⚠️ Limitations & Considerations**
- **Bundle Size**: React DevTools adds overhead in development
- **TypeScript Compilation**: Additional build step increases compilation time
- **Learning Curve**: TypeScript generics can be complex for complex state shapes
- **Hydration Issues**: SSR not applicable, but state rehydration from persistence needed
- **Re-renders**: Unnecessary re-renders can impact timeline performance with large datasets

#### **🚨 Common Pitfalls**
- **useEffect Dependencies**: Missing dependencies causing stale closures
- **State Mutations**: Directly mutating state objects instead of creating new ones
- **Key Props**: Using array indices as keys for dynamic lists
- **Memory Leaks**: Not cleaning up subscriptions in useEffect cleanup
- **TypeScript Any**: Using `any` type defeating the purpose of TypeScript
- **Prop Drilling**: Passing props through multiple levels instead of context/state management

### 3. **UI Library & Styling**
**Decision: Tailwind CSS + Shadcn/ui + Radix UI**
- **Why**: Matches user's expertise, excellent Windows-native look and feel

#### **✅ Best Practices**
- **Design Tokens**: Use Tailwind config for consistent spacing, colors, typography
- **Component Variants**: Use CVA (Class Variance Authority) for component variations
- **Responsive Design**: Mobile-first approach even for desktop (window resizing)
- **Dark/Light Themes**: Implement CSS variables for theme switching
- **Accessibility**: Always include focus states and ARIA labels from Radix
- **Custom Components**: Wrap Radix primitives with project-specific styling
- **Purge Unused**: Configure PurgeCSS to remove unused Tailwind classes

#### **⚠️ Limitations & Considerations**
- **Bundle Size**: Full Tailwind CSS can be large without proper purging
- **Learning Curve**: Utility-first approach requires mental shift from traditional CSS
- **Customization**: Heavy customization may require PostCSS plugins
- **Debug Difficulty**: Long class strings can be hard to debug
- **Radix Dependencies**: Radix UI adds multiple peer dependencies

#### **🚨 Common Pitfalls**
- **Utility Overuse**: Creating overly long className strings instead of components
- **Missing Purge Config**: Not configuring content paths for unused CSS removal
- **Accessibility Neglect**: Overriding Radix accessibility features
- **Theme Inconsistency**: Not using design tokens, hardcoding colors/spacing
- **Performance**: Not lazy loading Radix components that aren't immediately visible
- **Responsive Breakpoints**: Using arbitrary values instead of standard breakpoints

### 4. **Local Database**
**Decision: SQLite with better-sqlite3**
- **Why**: Perfect for local desktop apps, excellent performance, zero configuration

#### **✅ Best Practices**
- **Prepared Statements**: Always use prepared statements to prevent SQL injection
- **Transaction Batching**: Batch multiple writes in transactions for performance
- **Indexing Strategy**: Create indexes on timestamp and activity_type columns
- **Schema Migrations**: Implement versioned schema migrations with rollback capability
- **Connection Pooling**: Use a single connection per process, avoid multiple connections
- **WAL Mode**: Enable Write-Ahead Logging for better concurrent read performance
- **Vacuum Regularly**: Schedule VACUUM operations to reclaim disk space
- **Foreign Keys**: Enable foreign key constraints for data integrity

#### **⚠️ Limitations & Considerations**
- **Concurrent Writes**: Limited to one writer at a time (readers can be concurrent)
- **Database Size**: Performance degrades with databases >1TB (not applicable here)
- **Memory Usage**: entire database isn't cached, but frequently accessed pages are
- **Cross-Platform**: Database files not portable between different architectures
- **Backup Strategy**: File-based backups require proper locking during copy

#### **🚨 Common Pitfalls**
- **Database Locking**: Long-running transactions blocking other operations
- **Missing Indexes**: Not indexing frequently queried columns (timestamps, user_id)
- **SQL Injection**: Using string concatenation instead of prepared statements
- **Connection Leaks**: Not properly closing database connections in error cases
- **Schema Changes**: Dropping columns without proper migration strategy
- **File Permissions**: Database file not accessible due to Windows permission issues
- **Disk Space**: Not monitoring disk space, causing database corruption on full disk

### 5. **Local AI Processing**
**Decision: Ollama + Llama 3.2 (3B model)**
- **Why**: Completely offline, privacy-preserving, sufficient for classification tasks

#### **✅ Best Practices**
- **Model Management**: Keep model versions pinned, test upgrades in isolation
- **Prompt Engineering**: Use consistent, well-tested prompts for classification
- **Response Caching**: Cache AI responses for identical activity patterns
- **Error Handling**: Implement graceful fallbacks when Ollama is unavailable
- **Resource Monitoring**: Monitor CPU/RAM usage during inference
- **Batch Processing**: Process multiple activities in single requests when possible
- **Temperature Settings**: Use low temperature (0.1-0.3) for consistent classification
- **System Prompts**: Use detailed system prompts for context and format consistency

#### **⚠️ Limitations & Considerations**
- **Hardware Requirements**: Minimum 8GB RAM recommended for 3B model
- **Cold Start Time**: First request after model load takes 5-10 seconds
- **CPU Intensive**: High CPU usage during inference (can impact system performance)
- **Model Size**: 3B model requires ~6GB storage space
- **Context Window**: Limited context window for very long activity descriptions
- **Accuracy Trade-offs**: Smaller models less accurate than cloud-based alternatives
- **Network Dependency**: Requires localhost network access to Ollama server

#### **🚨 Common Pitfalls**
- **Ollama Not Running**: App assumes Ollama is always available without checking
- **Memory Exhaustion**: Not monitoring system memory before making inference requests
- **Prompt Injection**: User activity text potentially containing malicious prompts
- **Model Hallucination**: Accepting obviously incorrect AI classifications without validation
- **Rate Limiting**: Making too many concurrent requests causing timeouts
- **Version Compatibility**: Ollama API changes breaking existing integration
- **Output Parsing**: Not handling malformed JSON responses from model

### 6. **System Monitoring**
**Decision: Node.js Native Addons + Windows APIs**
- **Libraries**: `active-win`, `node-window-manager`, `systeminformation`, PowerShell integration

#### **✅ Best Practices**
- **Polling Optimization**: Use efficient polling intervals (500ms-1s) to balance accuracy vs performance
- **Permission Handling**: Request only necessary Windows permissions, handle denials gracefully
- **Error Recovery**: Implement retry logic for transient Windows API failures
- **Resource Cleanup**: Properly dispose of native resources and event listeners
- **Privacy Filters**: Filter out sensitive window titles (passwords, private browsing)
- **Performance Monitoring**: Track CPU usage of monitoring threads
- **Startup Optimization**: Lazy load native modules only when needed

#### **⚠️ Limitations & Considerations**
- **Windows Version Compatibility**: APIs may behave differently across Windows versions
- **Native Compilation**: Requires Visual Studio Build Tools or similar for native modules
- **Performance Impact**: System monitoring adds 1-3% CPU overhead
- **Permission Requirements**: Some APIs require elevated privileges
- **Antivirus Conflicts**: Security software may flag system monitoring as suspicious
- **Process Visibility**: Some processes may be hidden from monitoring APIs
- **Memory Overhead**: Native modules add ~10-20MB to memory footprint

#### **🚨 Common Pitfalls**
- **Infinite Loops**: Monitoring callbacks triggering recursive calls
- **Memory Leaks**: Not properly releasing native handles and event listeners
- **Permission Errors**: Not handling Windows UAC permission requirements
- **Process Crashes**: Native addon crashes bringing down entire Electron app
- **Polling Frequency**: Too frequent polling causing high CPU usage
- **Unicode Handling**: Incorrect handling of non-ASCII characters in window titles
- **Zombie Processes**: Not properly cleaning up child PowerShell processes

### 7. **Workflow Automation**
**Decision: N8N (Local Instance)**
- **Why**: Visual workflow builder, extensive integrations, runs locally

#### **✅ Best Practices**
- **Workflow Versioning**: Export workflows as JSON for version control
- **Error Handling**: Implement proper error handling and retry logic in workflows
- **Credential Management**: Use N8N's secure credential storage for API keys
- **Webhook Security**: Secure webhook endpoints with authentication tokens
- **Resource Limits**: Set appropriate execution timeouts and memory limits
- **Logging Strategy**: Enable comprehensive logging for debugging workflows
- **Backup Strategy**: Regular backups of N8N database and workflow configurations

#### **⚠️ Limitations & Considerations**
- **Local Only**: No cloud synchronization of workflows across devices
- **Performance**: Large workflows may consume significant CPU/memory
- **Port Conflicts**: Default port 5678 may conflict with other services
- **Database Requirements**: Requires SQLite/PostgreSQL for workflow storage
- **Update Management**: Manual updates required for security patches
- **Browser Dependency**: Web interface requires browser for workflow design
- **Learning Curve**: Visual workflow builder has initial learning curve

#### **🚨 Common Pitfalls**
- **Infinite Loops**: Workflows triggering themselves causing endless execution
- **Credential Exposure**: Accidentally committing credentials in workflow exports
- **Resource Exhaustion**: Workflows consuming all available system resources
- **Webhook Failures**: Not handling webhook failures gracefully
- **Data Validation**: Not validating workflow input data causing errors
- **Trigger Conflicts**: Multiple workflows triggering on same event
- **Version Drift**: Production and development workflows getting out of sync

### 8. **State Management**
**Decision: Zustand**
- **Why**: Simple, TypeScript-first, perfect for dashboard state

#### **✅ Best Practices**
- **Store Slicing**: Split large stores into focused slices for better organization
- **Immer Integration**: Use Immer for complex state updates to avoid mutations
- **TypeScript Integration**: Define strict types for all store states and actions
- **Persistence**: Use zustand/middleware/persist for settings and user preferences
- **DevTools**: Enable Redux DevTools for debugging in development
- **Shallow Equality**: Use shallow comparison for object state to prevent unnecessary re-renders
- **Action Naming**: Use descriptive action names following consistent naming conventions

#### **⚠️ Limitations & Considerations**
- **Bundle Size**: Additional middleware adds to bundle size
- **Learning Curve**: Different from Redux, requires mental model adjustment
- **DevTools**: DevTools integration not as rich as Redux DevTools
- **Middleware**: Limited middleware ecosystem compared to Redux
- **Time Travel**: No built-in time travel debugging capabilities
- **Server State**: Not designed for server state management (use with React Query if needed)

#### **🚨 Common Pitfalls**
- **State Mutations**: Directly mutating state objects instead of creating new ones
- **Selector Overuse**: Creating too many granular selectors causing performance issues
- **Store Coupling**: Tightly coupling components to store structure
- **Missing Persistence**: Not persisting important user settings across sessions
- **Async Actions**: Not handling async operations properly within actions
- **Memory Leaks**: Not unsubscribing from store changes in components
- **Store Pollution**: Adding UI-specific state to global store instead of component state

### 9. **Build Tools & Development**
**Decision: Vite + Electron Builder**
- **Why**: Fast development builds, excellent TypeScript support, reliable Windows packaging

#### **✅ Best Practices**
- **Environment Configuration**: Separate configs for development, staging, and production
- **Code Splitting**: Use dynamic imports for lazy loading of heavy components
- **Asset Optimization**: Configure proper asset optimization and compression
- **Source Maps**: Enable source maps for production debugging but exclude from distribution
- **Build Caching**: Use Vite's built-in caching for faster subsequent builds
- **Dependency Optimization**: Pre-bundle dependencies for faster development startup
- **Type Checking**: Run TypeScript type checking alongside Vite builds

#### **⚠️ Limitations & Considerations**
- **ESM vs CommonJS**: Potential compatibility issues with older Node.js modules
- **Build Time**: Large projects may have longer production build times
- **Native Dependencies**: Native modules require separate compilation pipeline
- **Memory Usage**: Vite dev server can consume significant memory for large projects
- **Windows Packaging**: Electron Builder requires Windows for proper Windows builds
- **Code Signing**: Production builds require code signing certificates
- **Bundle Analysis**: Limited built-in bundle analysis compared to Webpack

#### **🚨 Common Pitfalls**
- **Import Path Issues**: Incorrect relative imports causing build failures
- **Dynamic Imports**: Not handling dynamic import failures gracefully
- **Environment Variables**: Not properly configuring environment variables for different builds
- **Native Module Building**: Native modules failing to build on different platforms
- **Asset References**: Incorrect asset path references in production builds
- **Hot Reload Issues**: Hot reload not working properly with Electron main process
- **Build Scripts**: Not properly configuring build scripts for CI/CD pipelines

### 10. **Data Visualization**
**Decision: Recharts + D3 utilities**
- **Why**: Perfect for timeline visualization, React-native, highly customizable

#### **✅ Best Practices**
- **Data Preprocessing**: Transform data before passing to charts, not during rendering
- **Performance Optimization**: Use `ResponsiveContainer` and implement virtualization for large datasets
- **Accessibility**: Include proper ARIA labels and keyboard navigation for chart elements
- **Color Management**: Use consistent color schemes and ensure color contrast for accessibility
- **Tooltip Optimization**: Implement custom tooltips with relevant context information
- **Animation Control**: Use meaningful animations but allow users to disable them
- **Responsive Design**: Ensure charts work across different window sizes and zoom levels

#### **⚠️ Limitations & Considerations**
- **Bundle Size**: Recharts adds ~150KB to bundle, D3 utilities add additional weight
- **Performance**: Large timeline datasets (>10k points) may cause rendering performance issues
- **Customization Limits**: Some advanced visualizations may require direct D3 implementation
- **SVG Rendering**: Charts are SVG-based, which can be memory intensive for complex visualizations
- **Mobile Adaptation**: Touch interactions need special consideration for desktop app
- **Real-time Updates**: Frequent data updates can cause chart flickering without proper optimization

#### **🚨 Common Pitfalls**
- **Data Mutation**: Mutating chart data props causing unexpected re-renders
- **Memory Leaks**: Not properly cleaning up chart animations and event listeners
- **Responsive Issues**: Charts not adapting properly to container size changes
- **Performance Degradation**: Not implementing virtualization for large datasets
- **Accessibility Neglect**: Missing ARIA labels and keyboard navigation
- **Color Conflicts**: Using too many similar colors making data hard to distinguish
- **Animation Overload**: Excessive animations causing performance issues and user distraction

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Electron Main Process               │
├─────────────────────────────────────────────────────────┤
│  System Monitoring  │  SQLite Database  │  N8N Instance │
│  (Native Addons)    │  (Activity Logs)  │  (Automation) │
└─────────────────────────────────────────────────────────┘
                              │
                              │ IPC Communication
                              │
┌─────────────────────────────────────────────────────────┐
│                   Electron Renderer Process             │
├─────────────────────────────────────────────────────────┤
│     React + TypeScript + Tailwind CSS UI               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │  Dashboard  │ │  Timeline   │ │  Settings   │      │
│  │  Component  │ │  Component  │ │  Component  │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                         │
│              Zustand State Management                   │
└─────────────────────────────────────────────────────────┘
                              │
                              │ HTTP Requests
                              │
┌─────────────────────────────────────────────────────────┐
│                    Ollama Local Server                  │
├─────────────────────────────────────────────────────────┤
│         Llama 3.2 Model (Session Classification)       │
└─────────────────────────────────────────────────────────┘
```

## 📦 Key Dependencies

### Core Framework
```json
{
  "electron": "latest",
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "@types/react": "^18.0.0"
}
```

### UI & Styling
```json
{
  "tailwindcss": "^3.4.0",
  "@radix-ui/react-dialog": "latest",
  "@radix-ui/react-dropdown-menu": "latest",
  "lucide-react": "latest"
}
```

### Data & State
```json
{
  "better-sqlite3": "^9.0.0",
  "zustand": "^4.4.0",
  "recharts": "^2.8.0"
}
```

### System Integration
```json
{
  "active-win": "^8.0.0",
  "node-window-manager": "^2.2.0",
  "systeminformation": "^5.21.0"
}
```

### Development Tools
```json
{
  "vite": "^5.0.0",
  "electron-builder": "^24.0.0",
  "@vitejs/plugin-react": "^4.0.0"
}
```

## 🚀 Development Workflow

1. **Setup**: Ollama installation + Model download
2. **Development**: Vite dev server with hot reload
3. **System Integration**: Native addon compilation
4. **Database**: SQLite migrations and schema management
5. **AI Integration**: Local model fine-tuning with user feedback
6. **Packaging**: Electron Builder for Windows installer
7. **Distribution**: Direct download (no app store dependencies)

## 🔒 Privacy & Security Features

- **No Network Requests**: Except to local Ollama instance
- **Local Encryption**: SQLite database encryption
- **Secure Storage**: Electron's safeStorage for sensitive config
- **Permission Management**: Minimal required system permissions
- **Data Retention**: User-configurable automatic cleanup

## 📈 Performance Considerations

- **Lazy Loading**: Dashboard components load on demand
- **Virtual Scrolling**: For large timeline datasets
- **Database Indexing**: Optimized queries for activity logs
- **Model Caching**: Ollama responses cached locally
- **Background Processing**: Non-blocking UI operations

---

## ✅ Next Steps

1. **Project Initialization**: Set up Electron + Vite + React template
2. **Ollama Setup**: Install and configure local AI model
3. **Database Schema**: Design SQLite tables for activity logging
4. **System Monitoring**: Implement native window tracking
5. **UI Components**: Build dashboard timeline interface
6. **AI Integration**: Connect session classification to Ollama
7. **N8N Setup**: Configure local automation workflows

---

## 🎯 AI-First Development Conventions

### **File Organization & Modularity**
- **Max File Size**: 500 lines per file maximum for AI tool compatibility
- **Descriptive Naming**: Use clear, descriptive file and function names
- **File Headers**: Include purpose documentation at the top of each file
- **Function Documentation**: JSDoc/TSDoc comments for all functions with purpose and parameters
- **Directory Structure**: Organize by feature, not by file type

### **Code Style Standards**
- **Functional Programming**: Prefer functional patterns over classes
- **Pure Functions**: Use `function` keyword for pure functions, document with block comments
- **No Enums**: Use maps instead of enums for better type safety
- **Descriptive Variables**: Use auxiliary verbs (isLoading, hasError, canSubmit)
- **Concise Conditionals**: Avoid unnecessary curly braces for simple statements
- **Error Handling**: Throw errors instead of adding fallback values

### **TypeScript Best Practices**
- **Strict Mode**: Enable all TypeScript strict checks
- **Explicit Types**: Define interfaces for all data structures
- **Generic Types**: Use generics for reusable components and functions
- **Type Guards**: Implement proper type guards for runtime safety
- **No Any**: Avoid `any` type, use `unknown` with proper type checking

### **Performance Guidelines**
- **Lazy Loading**: Implement lazy loading for all non-critical components
- **Memoization**: Use React.memo() and useMemo() judiciously, not by default
- **Virtual Scrolling**: Implement for any lists >100 items
- **Bundle Optimization**: Regular bundle analysis and code splitting
- **Memory Management**: Proper cleanup of event listeners and subscriptions

### **Security Considerations**
- **Input Validation**: Validate all external input (user input, file content, API responses)
- **SQL Injection Prevention**: Always use prepared statements
- **XSS Prevention**: Sanitize any user-generated content before display
- **Electron Security**: Follow Electron security checklist (context isolation, etc.)
- **Local File Access**: Validate file paths to prevent directory traversal attacks

### **Testing Strategy**
- **Unit Tests**: Test all pure functions and utility functions
- **Integration Tests**: Test component interactions and data flow
- **E2E Tests**: Test critical user workflows with Playwright
- **Performance Tests**: Monitor memory usage and response times
- **Security Tests**: Regular security audits of dependencies

### **Development Workflow**
- **Branch Strategy**: Feature branches with descriptive names
- **Commit Messages**: Use conventional commit format
- **Code Reviews**: All changes require peer review
- **CI/CD Pipeline**: Automated testing and building
- **Documentation**: Keep all documentation up to date with changes

### **Privacy & Data Protection**
- **Data Minimization**: Collect only necessary activity data
- **Local Processing**: All sensitive operations happen locally
- **Data Retention**: Implement configurable data retention policies
- **User Control**: Users must be able to delete all their data
- **Encryption**: Encrypt sensitive data at rest

### **Monitoring & Observability**
- **Error Tracking**: Comprehensive error logging and tracking
- **Performance Monitoring**: Monitor app performance metrics
- **User Analytics**: Track feature usage (locally only)
- **Health Checks**: Monitor system dependencies (Ollama, database)
- **Resource Usage**: Monitor CPU, memory, and disk usage

This comprehensive stack and set of practices provides the foundation for building FocusFlare as a privacy-first, Windows-optimized desktop application that maintains excellent developer experience, user performance, and long-term maintainability in an AI-first development environment. 