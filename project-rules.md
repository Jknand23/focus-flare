# FocusFlare Project Rules & Development Standards
*"AI-First Codebase: Modular, Scalable, and Intelligently Organized"*

## Overview
This document establishes the core development rules, file organization standards, and coding conventions for FocusFlare. These rules are designed to maximize compatibility with modern AI tools while ensuring maintainable, scalable code that aligns with our "privacy-first Windows desktop application" philosophy.

---

## 🏗️ Project Directory Structure

### **Feature-Based Organization**
Organize code by feature/domain, not by file type. This improves AI tool navigation and logical grouping.

```
FocusFlare/
├── src/
│   ├── main/                          # Electron main process
│   │   ├── system-monitoring/         # Native system integration
│   │   │   ├── window-tracker.ts      # Active window detection
│   │   │   ├── activity-logger.ts     # Activity data collection
│   │   │   └── idle-detector.ts       # User idle state detection
│   │   ├── database/                  # SQLite data layer
│   │   │   ├── migrations/            # Database schema versions
│   │   │   ├── models/                # Data models and types
│   │   │   ├── connection.ts          # Database connection management
│   │   │   └── queries.ts             # Prepared SQL statements
│   │   ├── ai-integration/            # Local AI processing
│   │   │   ├── ollama-client.ts       # Ollama API integration
│   │   │   ├── session-classifier.ts  # AI session labeling
│   │   │   └── prompt-templates.ts    # AI prompt management
│   │   ├── automation/                # N8N workflow integration
│   │   │   ├── workflow-manager.ts    # N8N instance management
│   │   │   └── recipe-templates.ts    # Predefined automation recipes
│   │   └── main.ts                    # Main process entry point
│   │
│   ├── renderer/                      # Electron renderer process
│   │   ├── components/                # Reusable UI components
│   │   │   ├── ui/                    # Base UI primitives (buttons, inputs)
│   │   │   ├── timeline/              # Timeline visualization components
│   │   │   ├── dashboard/             # Dashboard-specific components
│   │   │   ├── settings/              # Settings panel components
│   │   │   └── system-tray/           # System tray menu components
│   │   ├── pages/                     # Top-level page components
│   │   │   ├── dashboard-page.tsx     # Main dashboard view
│   │   │   ├── settings-page.tsx      # Settings configuration
│   │   │   └── onboarding-page.tsx    # First-time user setup
│   │   ├── stores/                    # Zustand state management
│   │   │   ├── activity-store.ts      # Activity data state
│   │   │   ├── settings-store.ts      # User preferences state
│   │   │   └── ui-store.ts            # UI state management
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── use-activity-data.ts   # Activity data fetching
│   │   │   ├── use-ai-classification.ts # AI processing hooks
│   │   │   └── use-theme.ts           # Theme management
│   │   ├── utils/                     # Utility functions
│   │   │   ├── date-formatting.ts     # Date/time utilities
│   │   │   ├── session-analysis.ts    # Session data processing
│   │   │   └── color-management.ts    # Theme color utilities
│   │   ├── types/                     # TypeScript type definitions
│   │   │   ├── activity-types.ts      # Activity data structures
│   │   │   ├── ui-types.ts            # UI component types
│   │   │   └── store-types.ts         # State management types
│   │   └── main.tsx                   # Renderer entry point
│   │
│   ├── shared/                        # Code shared between main/renderer
│   │   ├── constants/                 # Application constants
│   │   ├── types/                     # Shared TypeScript types
│   │   └── ipc/                       # IPC communication protocols
│   │
│   └── preload/                       # Electron preload scripts
│       └── preload.ts                 # Secure API exposure
│
├── assets/                            # Static assets
│   ├── icons/                         # Application icons
│   ├── images/                        # UI images and graphics
│   └── fonts/                         # Custom fonts (if any)
│
├── docs/                              # Project documentation
│   ├── api/                           # API documentation
│   ├── guides/                        # Development guides
│   └── architecture/                  # Architecture diagrams
|   └── phases/                        # Development phases
│
├── scripts/                           # Build and development scripts
│   ├── build.ts                       # Production build script
│   ├── dev.ts                         # Development server script
│   └── migrate.ts                     # Database migration script
│
├── tests/                             # Test files
│   ├── unit/                          # Unit tests
│   ├── integration/                   # Integration tests
│   └── e2e/                           # End-to-end tests
│
├── config/                            # Configuration files
│   ├── vite.config.ts                 # Vite configuration
│   ├── electron-builder.json          # Packaging configuration
│   └── tailwind.config.js             # Tailwind CSS configuration
│
└── [standard files]                   # Package.json, README, etc.
```

---

## 📝 File Naming Conventions

### **File Naming Standards**
- **Use kebab-case for files**: `window-tracker.ts`, `session-classifier.ts`
- **Use PascalCase for React components**: `DashboardPage.tsx`, `TimelineChart.tsx`
- **Use descriptive, specific names**: Avoid generic names like `utils.ts` or `helpers.ts`
- **Include purpose in name**: `use-activity-data.ts` (hook), `activity-store.ts` (store)
- **Use consistent suffixes**:
  - `.types.ts` for type definitions
  - `.store.ts` for Zustand stores
  - `.hook.ts` or `use-*.ts` for custom hooks
  - `.utils.ts` for utility functions (when specific)
  - `.constants.ts` for constants
  - `.config.ts` for configuration

### **Directory Naming Standards**
- **Use kebab-case**: `system-monitoring/`, `ai-integration/`
- **Use singular nouns when appropriate**: `component/` not `components/` (except for established conventions)
- **Be descriptive and specific**: `timeline/` not `charts/`, `system-monitoring/` not `monitoring/`
- **Group by feature/domain**: `dashboard/`, `settings/`, `automation/`

---

## 📋 Code Organization Rules

### **File Structure Standards**
Every file must follow this structure:

```typescript
/**
 * [File Name] - [Brief Description]
 * 
 * [Detailed explanation of the file's purpose, what it contains, and how it fits
 * into the larger application architecture. Include any important usage notes
 * or dependencies.]
 * 
 * @module [ModuleName]
 * @author FocusFlare Team
 * @since [Version]
 */

// === IMPORTS ===
// External dependencies first
import React from 'react';
import { useState, useEffect } from 'react';

// Internal imports grouped by type
import { ActivityData, SessionType } from '@/types/activity-types';
import { useActivityStore } from '@/stores/activity-store';
import { formatDuration } from '@/utils/date-formatting';

// === TYPES ===
// Local types and interfaces
interface ComponentProps {
  /** Description of prop */
  data: ActivityData[];
  /** Description of prop */
  onSessionSelect?: (sessionId: string) => void;
}

// === CONSTANTS ===
// Local constants
const DEFAULT_POLLING_INTERVAL = 5000;
const MAX_RETRY_ATTEMPTS = 3;

// === MAIN IMPLEMENTATION ===
// Functions, components, classes, etc.

// === EXPORTS ===
// Explicit exports at the end
export { ComponentName };
export type { ComponentProps };
```

### **Function Documentation Standards**
All functions must include comprehensive JSDoc/TSDoc comments:

```typescript
/**
 * Processes raw activity data into categorized sessions using AI classification.
 * 
 * This function takes raw window activity logs and uses the local Ollama instance
 * to classify each activity session into categories like "Focused Work", "Research",
 * "Entertainment", etc. It handles batching for performance and implements retry
 * logic for failed classifications.
 * 
 * @param rawActivities - Array of raw activity log entries from system monitoring
 * @param classificationOptions - Configuration options for AI classification
 * @param classificationOptions.batchSize - Number of activities to process per batch (default: 10)
 * @param classificationOptions.includeContext - Whether to include surrounding context (default: true)
 * @returns Promise resolving to array of classified session data
 * 
 * @throws {OllamaConnectionError} When unable to connect to local Ollama instance
 * @throws {ClassificationError} When AI classification fails after max retries
 * 
 * @example
 * ```typescript
 * const rawData = await getLastHourActivities();
 * const sessions = await classifyActivitySessions(rawData, {
 *   batchSize: 5,
 *   includeContext: true
 * });
 * console.log(`Classified ${sessions.length} sessions`);
 * ```
 */
async function classifyActivitySessions(
  rawActivities: RawActivityData[],
  classificationOptions: ClassificationOptions = {}
): Promise<ClassifiedSession[]> {
  // Implementation...
}
```

### **Component Documentation Standards**
React components require comprehensive documentation:

```typescript
/**
 * TimelineChart - Interactive timeline visualization for daily activity sessions
 * 
 * Displays a horizontal timeline showing color-coded activity sessions throughout
 * the day. Supports zooming, filtering, and session selection. Integrates with
 * the activity store for real-time updates and handles user customization of
 * session colors.
 * 
 * @component
 * @example
 * ```tsx
 * <TimelineChart
 *   date={new Date()}
 *   sessions={todaySessions}
 *   onSessionClick={handleSessionSelect}
 *   showBackground={true}
 * />
 * ```
 */
interface TimelineChartProps {
  /** Date to display timeline for */
  date: Date;
  /** Array of classified session data to visualize */
  sessions: ClassifiedSession[];
  /** Callback fired when user clicks on a session block */
  onSessionClick?: (session: ClassifiedSession) => void;
  /** Whether to show background/ambient activities */
  showBackground?: boolean;
  /** Custom height for the timeline (default: 60px) */
  height?: number;
}

function TimelineChart({
  date,
  sessions,
  onSessionClick,
  showBackground = true,
  height = 60
}: TimelineChartProps) {
  // Implementation...
}
```

---

## 🚫 File Size Restrictions

### **Maximum File Sizes**
- **500 lines maximum** per file (hard limit for AI compatibility)
- **350 lines target** for most files (recommended for readability)
- **200 lines preferred** for React components
- **Files exceeding limits must be split** into logical modules

### **File Splitting Guidelines**
When a file approaches the limit:

```typescript
// BEFORE: Large component file (500+ lines)
// components/dashboard/DashboardPage.tsx

// AFTER: Split into focused modules
// components/dashboard/DashboardPage.tsx (main component)
// components/dashboard/DashboardHeader.tsx (header section)
// components/dashboard/ActivitySummary.tsx (summary cards)
// components/dashboard/TimelineSection.tsx (timeline container)
// hooks/use-dashboard-data.ts (data fetching logic)
// utils/dashboard-calculations.ts (calculation utilities)
```

---

## 🎯 Development Patterns

### **Functional Programming Patterns**
- **Prefer function declarations** over classes for pure functions
- **Avoid classes** except when necessary (e.g., error classes)
- **Use immutable data patterns** - never mutate props or state directly
- **Prefer composition** over inheritance
- **Use pure functions** wherever possible

### **Error Handling Patterns**
- **Throw errors** instead of returning fallback values
- **Use descriptive error types** with clear messages
- **Handle errors at appropriate boundaries**
- **Provide user-friendly error messages**

### **TypeScript Standards**
- **Enable strict mode** in tsconfig.json
- **Define explicit interfaces** for all data structures
- **Use type guards** for runtime type safety
- **Avoid `any` type** - use `unknown` with proper type checking
- **Use generic types** for reusable components and functions

---

## 🧪 Testing Requirements

### **Test File Organization**
```
tests/
├── unit/
│   ├── components/
│   │   └── timeline/
│   │       └── TimelineChart.test.tsx
│   ├── utils/
│   │   └── date-formatting.test.ts
│   └── stores/
│       └── activity-store.test.ts
├── integration/
│   ├── ai-classification.test.ts
│   └── database-operations.test.ts
└── e2e/
    ├── dashboard-workflow.test.ts
    └── settings-configuration.test.ts
```

### **Testing Standards**
- **Test file naming**: `[filename].test.ts` or `[filename].spec.ts`
- **Co-locate tests** with source files when appropriate
- **Comprehensive coverage** for utility functions and business logic
- **Integration tests** for AI classification and database operations
- **E2E tests** for critical user workflows

---

## 📚 Documentation Standards

### **Code Documentation Requirements**
- **File header comment** explaining purpose and context
- **Function documentation** with JSDoc/TSDoc for all public functions
- **Inline comments** for complex logic or business rules
- **Type definitions** with descriptive property comments
- **Usage examples** in documentation comments

### **README Requirements**
Each feature directory should include a `README.md` with:
- **Purpose** of the module/feature
- **Key components** and their responsibilities
- **Dependencies** and integration points
- **Usage examples** and common patterns
- **Testing instructions** and considerations

### **API Documentation**
- **IPC channels** must be documented with message formats
- **Database schemas** must include field descriptions and constraints
- **Configuration options** must include default values and validation rules

---

## 🔒 Security & Privacy Rules

### **Data Handling Standards**
- **Local storage only** - no cloud synchronization
- **Encrypt sensitive data** using Electron's safeStorage API
- **Validate all inputs** to prevent injection attacks
- **Sanitize user-generated content** before display
- **Implement proper file path validation** to prevent directory traversal

### **Electron Security Checklist**
- **Context isolation enabled** in all renderer processes
- **Node integration disabled** in renderer processes
- **Preload scripts** for secure API exposure
- **CSP headers** configured for web security
- **Secure defaults** for all Electron security settings

---

## 🚀 Performance Guidelines

### **Code Performance Rules**
- **Lazy load components** that aren't immediately visible
- **Implement virtualization** for lists with >100 items
- **Use React.memo()** judiciously, not by default
- **Optimize bundle size** with code splitting and tree shaking
- **Monitor memory usage** and clean up subscriptions

### **Database Performance**
- **Use prepared statements** for all database queries
- **Implement proper indexing** on frequently queried columns
- **Batch operations** when processing multiple records
- **Monitor query performance** and optimize slow queries

---

## ✅ Code Quality Checklist

Before submitting any code, verify:
- [ ] **File size** under 500 lines
- [ ] **Descriptive naming** for files, functions, and variables
- [ ] **Complete documentation** with JSDoc/TSDoc comments
- [ ] **TypeScript strict mode** compliance
- [ ] **Error handling** implemented appropriately
- [ ] **Test coverage** for new functionality
- [ ] **Performance considerations** addressed
- [ ] **Security best practices** followed
- [ ] **Accessibility standards** met
- [ ] **Code formatting** consistent with project standards

---

## 🎭 AI-First Development Principles

### **Optimizing for AI Tools**
- **Consistent patterns** across the codebase for AI recognition
- **Descriptive names** that clearly convey intent
- **Self-documenting code** with clear business logic
- **Modular architecture** that AI can easily navigate
- **Explicit dependencies** and clear separation of concerns

### **AI Tool Compatibility**
- **File size limits** ensure AI can process entire files
- **Clear structure** helps AI understand context and relationships
- **Comprehensive documentation** provides AI with necessary context
- **Type safety** enables better AI code analysis and suggestions

---

*These project rules serve as the foundation for building FocusFlare's AI-first codebase, ensuring maintainable, scalable, and intelligently organized code that maximizes both human and AI tool effectiveness.*

---

## 🤖 Fun Fact
Why did the developer break up with their monolithic codebase? Because it had too many dependencies and refused to commit to modular architecture! 😄 Just like how FocusFlare's codebase stays focused and well-organized, relationships work better when everything has clear boundaries and good documentation! 