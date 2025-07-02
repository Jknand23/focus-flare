# Phase 1: Setup - Foundation & Basic Structure
*Duration: 1-2 weeks*

## Overview
Establish the core Electron application structure with minimal functionality. This phase creates a barebones but functional desktop application that can run on Windows, track basic system activity, and display minimal information. The goal is to have a working foundation that can be incrementally enhanced.

## Success Criteria
- ✅ Electron app launches and runs on Windows
- ✅ Basic system tray integration working
- ✅ Minimal activity logging to local storage
- ✅ Simple dashboard window opens
- ✅ Local SQLite database connection established
- ✅ Basic TypeScript + React setup functioning

---

## Features & Tasks

### 1. **Project Initialization & Build Setup**
**Objective**: Create the foundational project structure with proper build tools

**Tasks**:
1. Initialize Electron + Vite + React + TypeScript project template
2. Configure project structure following feature-based organization rules
3. Set up Tailwind CSS with basic configuration
4. Configure electron-builder for Windows packaging
5. Create development and build scripts with proper environment handling

**Deliverables**:
- Working `package.json` with all core dependencies
- Configured `vite.config.ts` for Electron + React
- Basic `electron-builder.json` for Windows builds
- Functional `src/` directory structure following project rules

### 2. **Basic Electron Main Process**
**Objective**: Implement core Electron functionality with system tray integration

**Tasks**:
1. Create main process entry point (`src/main/main.ts`)
2. Implement basic window management (hidden main window)
3. Add system tray icon with basic context menu
4. Set up IPC communication channels between main and renderer
5. Configure security settings (context isolation, node integration disabled)

**Deliverables**:
- System tray icon appears on Windows startup
- Right-click context menu with "Open Dashboard" and "Exit"
- Secure IPC communication established
- Hidden main window that can be shown/hidden

### 3. **SQLite Database Foundation**
**Objective**: Establish local database connection and basic schema

**Tasks**:
1. Install and configure better-sqlite3 for local database
2. Create basic database connection module (`src/main/database/connection.ts`)
3. Design initial schema for activity logging (activities table)
4. Implement basic database migration system
5. Create simple database health check and initialization

**Deliverables**:
- SQLite database file created in user data directory
- Basic `activities` table with columns: id, timestamp, app_name, window_title, duration
- Database connection module with error handling
- Simple migration runner for schema updates

### 4. **Minimal System Monitoring**
**Objective**: Basic activity tracking using native Windows APIs

**Tasks**:
1. Install and configure `active-win` package for window tracking
2. Create basic activity logger (`src/main/system-monitoring/activity-logger.ts`)
3. Implement simple polling mechanism (every 5 seconds)
4. Log basic activity data to SQLite database
5. Add basic error handling for permission issues

**Deliverables**:
- Active window detection working
- Basic activity logs stored in database (app name, window title, timestamp)
- Simple polling system that doesn't crash on errors
- Basic privacy filtering (exclude password managers, system windows)

### 5. **Basic React Dashboard**
**Objective**: Simple UI to display collected activity data

**Tasks**:
1. Create basic React app structure (`src/renderer/main.tsx`)
2. Implement simple dashboard page with activity list
3. Create basic IPC handlers to fetch activity data from main process
4. Display raw activity logs in a simple table format
5. Add basic styling with Tailwind CSS

**Deliverables**:
- Dashboard window opens when clicked from system tray
- Simple table showing recent activities (app name, time, duration)
- Basic responsive layout with Tailwind CSS
- IPC communication working to fetch data from main process

### 6. **Zustand State Management Setup**
**Objective**: Basic state management for UI components

**Tasks**:
1. Install and configure Zustand for state management
2. Create basic activity store (`src/renderer/stores/activity-store.ts`)
3. Implement simple state for activity data and UI state
4. Connect React components to Zustand store
5. Add basic TypeScript typing for store state

**Deliverables**:
- Zustand store managing activity data
- React components connected to store
- TypeScript interfaces for store state
- Basic state updates working correctly

---

## Technical Requirements

### **File Structure**
```
src/
├── main/
│   ├── database/
│   │   └── connection.ts
│   ├── system-monitoring/
│   │   └── activity-logger.ts
│   └── main.ts
├── renderer/
│   ├── components/
│   │   └── dashboard/
│   │       └── ActivityList.tsx
│   ├── stores/
│   │   └── activity-store.ts
│   └── main.tsx
├── shared/
│   ├── types/
│   │   └── activity-types.ts
│   └── constants/
│       └── app-constants.ts
└── preload/
    └── preload.ts
```

### **Key Dependencies**
```json
{
  "electron": "^28.0.0",
  "react": "^18.2.0",
  "typescript": "^5.0.0",
  "vite": "^5.0.0",
  "better-sqlite3": "^9.2.0",
  "active-win": "^8.0.0",
  "zustand": "^4.4.0",
  "tailwindcss": "^3.4.0"
}
```

### **Database Schema**
```sql
CREATE TABLE activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    app_name TEXT NOT NULL,
    window_title TEXT,
    duration INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_timestamp ON activities(timestamp);
CREATE INDEX idx_activities_app_name ON activities(app_name);
```

---

## Quality Assurance

### **Testing Requirements**
- Electron app launches successfully on Windows 10/11
- System tray integration works correctly
- Database connection and basic operations functional
- Activity logging captures data without crashing
- Dashboard displays activity data correctly
- IPC communication works between main and renderer processes

### **Performance Targets**
- App startup time: <3 seconds
- Memory usage: <100MB during idle
- CPU usage: <2% during active monitoring
- Database operations: <100ms for basic queries

### **Security Checklist**
- Context isolation enabled
- Node integration disabled in renderer
- Preload script properly configured
- Database file permissions set correctly
- No sensitive data in renderer process

---

## Known Limitations

- **No AI Classification**: Activities stored as raw data only
- **Basic UI**: Minimal styling and functionality
- **Limited Error Handling**: Basic error catching without user feedback
- **No User Preferences**: Hard-coded settings only
- **Windows Only**: No cross-platform support implemented
- **No Data Retention**: Unlimited data storage

---

## Next Phase Preview

Phase 2 (MVP) will add:
- Local AI integration with Ollama
- Basic session classification
- Improved dashboard with timeline view
- User settings and preferences
- Better error handling and user feedback
- Basic system tray quick stats

---

*This setup phase establishes the foundation for FocusFlare's core functionality while maintaining the project's privacy-first and modular architecture principles.* 