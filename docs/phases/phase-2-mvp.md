# Phase 2: MVP - Core Intelligence & User Experience
*Duration: 3-4 weeks*

## Overview
Transform the basic setup into a functional MVP that delivers FocusFlare's core value proposition. This phase integrates local AI for intelligent session classification, creates an intuitive timeline dashboard, and implements essential user interaction features. The result is a usable application that provides meaningful insights about digital focus patterns.

## Success Criteria
- ✅ Ollama integration with local AI classification working
- ✅ Visual timeline dashboard displaying color-coded sessions
- ✅ Session label correction and learning functionality
- ✅ Basic user settings and preferences
- ✅ System tray quick stats and notifications
- ✅ Idle detection and session boundary management
- ✅ Basic onboarding flow for new users

---

## Features & Tasks

### 1. **Local AI Integration with Ollama**
**Objective**: Implement intelligent session classification using local AI processing

**Tasks**:
1. Set up Ollama client integration (`src/main/ai-integration/ollama-client.ts`)
2. Create session classification logic with prompt templates
3. Implement batch processing for efficient AI inference
4. Add error handling and fallback mechanisms for AI unavailability
5. Create background processing queue for non-blocking classification

**Deliverables**:
- Ollama API client with connection management
- AI classification system that processes activity logs into sessions
- Prompt templates for consistent classification results
- Background processing that doesn't block UI
- Error handling for when Ollama is unavailable

### 2. **Session Management & Processing**
**Objective**: Transform raw activity logs into meaningful work sessions

**Tasks**:
1. Create session processing engine (`src/main/ai-integration/session-classifier.ts`)
2. Implement idle detection and session boundary logic
3. Add session aggregation and duration calculation
4. Create session types (Focused Work, Research, Entertainment, etc.)
5. Implement session persistence and retrieval from database

**Deliverables**:
- Session detection algorithm that groups activities intelligently
- Database schema updated with sessions table
- Session classification into predefined categories
- Session duration and boundary calculation
- Session persistence with proper indexing

### 3. **Timeline Dashboard Interface**
**Objective**: Create intuitive visual representation of daily activity patterns

**Tasks**:
1. Build timeline visualization component (`src/renderer/components/timeline/TimelineChart.tsx`)
2. Implement color-coded session blocks with hover information
3. Create session filtering and grouping controls
4. Add date navigation and time range selection
5. Implement responsive design for different window sizes

**Deliverables**:
- Interactive timeline showing color-coded activity sessions
- Hover tooltips with session details (app, duration, classification)
- Filter controls for session types and time ranges
- Date picker for viewing historical data
- Responsive layout that works on various screen sizes

### 4. **Session Label Correction & Learning**
**Objective**: Enable user feedback to improve AI classification accuracy

**Tasks**:
1. Create session detail modal (`src/renderer/components/dashboard/SessionModal.tsx`)
2. Implement label correction interface with dropdown selection
3. Add optional reflection prompt for user insights
4. Create feedback storage system for AI learning
5. Implement real-time session label updates

**Deliverables**:
- Session detail modal with correction interface
- Dropdown menu for changing session labels
- Optional text input for user reflection and context
- Feedback data storage for future AI improvements
- Immediate UI updates when labels are corrected

### 5. **User Settings & Preferences**
**Objective**: Allow customization of core application behavior and appearance

**Tasks**:
1. Create settings store (`src/renderer/stores/settings-store.ts`)
2. Build settings panel (`src/renderer/components/settings/SettingsPanel.tsx`)
3. Implement work schedule and goal configuration
4. Add color customization for session types
5. Create data retention and privacy controls

**Deliverables**:
- Settings panel accessible from system tray and dashboard
- Work schedule configuration (work hours, break preferences)
- Custom color selection for session categories
- Data retention settings (how long to keep data)
- Privacy controls (app exclusions, monitoring pause)

### 6. **Enhanced System Tray Experience**
**Objective**: Provide quick access to key information and controls

**Tasks**:
1. Enhance system tray menu with quick stats
2. Implement hover tooltip with current session info
3. Add gentle morning nudge notifications
4. Create pause/resume monitoring functionality
5. Add quick dashboard access shortcuts

**Deliverables**:
- System tray tooltip showing current session and daily progress
- Context menu with quick stats (focus time, current session duration)
- Optional morning notification about yesterday's summary
- Pause/resume toggle for monitoring
- Direct access to dashboard and settings

### 7. **Onboarding Flow**
**Objective**: Guide new users through initial setup and explain core concepts

**Tasks**:
1. Create welcome screen (`src/renderer/components/onboarding/WelcomeScreen.tsx`)
2. Implement privacy notice and permission requests
3. Add basic preferences setup (work goals, schedules)
4. Create first-time dashboard walkthrough
5. Implement onboarding progress tracking

**Deliverables**:
- Welcome screen explaining FocusFlare's purpose and privacy approach
- Permission request flow for system monitoring
- Initial preferences setup (work goals, basic settings)
- Dashboard feature walkthrough for first-time users
- Onboarding completion tracking to avoid repeating flow

---

## Technical Requirements

### **Enhanced Database Schema**
```sql
-- Enhanced activities table
ALTER TABLE activities ADD COLUMN session_id INTEGER;
ALTER TABLE activities ADD COLUMN is_idle BOOLEAN DEFAULT FALSE;

-- New sessions table
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    duration INTEGER NOT NULL,
    session_type TEXT NOT NULL,
    confidence_score REAL DEFAULT 0.0,
    user_corrected BOOLEAN DEFAULT FALSE,
    user_feedback TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User settings table
CREATE TABLE user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI feedback table for learning
CREATE TABLE ai_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES sessions(id),
    original_classification TEXT,
    corrected_classification TEXT,
    user_context TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_type ON sessions(session_type);
CREATE INDEX idx_activities_session_id ON activities(session_id);
```

### **Key New Dependencies**
```json
{
  "recharts": "^2.8.0",
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-dropdown-menu": "^2.0.6",
  "@radix-ui/react-select": "^2.0.0",
  "date-fns": "^2.30.0",
  "lucide-react": "^0.294.0"
}
```

### **AI Integration Architecture**
```typescript
// Session classification types
interface SessionClassification {
  type: 'focused-work' | 'research' | 'entertainment' | 'break' | 'unclear';
  confidence: number;
  reasoning: string;
}

// Ollama prompt template
const CLASSIFICATION_PROMPT = `
Analyze this computer activity session and classify it into one of these categories:
- focused-work: Concentrated work on documents, code, or professional tasks
- research: Reading, browsing for information, learning activities  
- entertainment: Games, videos, social media, leisure activities
- break: Short breaks, personal tasks, away from computer
- unclear: Insufficient data to determine activity type

Activities: {activities}
Duration: {duration} minutes

Respond with JSON: {"type": "category", "confidence": 0.8, "reasoning": "explanation"}
`;
```

---

## User Experience Flow

### **Daily Usage Pattern**
1. **Morning**: User starts computer, FocusFlare launches silently
2. **Optional Nudge**: Gentle notification about yesterday's summary (if enabled)
3. **Continuous Monitoring**: Activities logged and classified in background
4. **Dashboard Access**: User opens dashboard to review sessions
5. **Label Corrections**: User corrects any misclassified sessions
6. **Insight Gathering**: Optional reflection prompts for AI learning

### **Dashboard Interaction**
1. **Timeline View**: Visual timeline with color-coded session blocks
2. **Session Details**: Click on blocks to see detailed information
3. **Quick Stats**: At-a-glance metrics for daily progress
4. **Filtering**: Show/hide specific session types
5. **Label Correction**: Easy dropdown to correct session classifications

---

## Quality Assurance

### **Testing Requirements**
- AI classification produces reasonable results for common activity patterns
- Timeline visualization renders correctly with various data patterns
- Session label correction persists and updates display immediately
- Settings changes are saved and applied correctly
- System tray functionality works across Windows versions
- Onboarding flow completes successfully for new users

### **Performance Targets**
- AI classification: <30 seconds for 8-hour day of activities
- Timeline rendering: <2 seconds for full day view
- Dashboard load time: <1 second for current day
- Settings persistence: <100ms
- Memory usage: <150MB during normal operation

### **AI Quality Metrics**
- Classification accuracy: >80% for clear activity patterns
- False positive rate: <10% for obvious session types
- Processing time: <5 seconds per hour of activity data
- Ollama connection success rate: >95% when service is running

---

## Known Limitations

- **AI Accuracy**: Classification may be inconsistent for ambiguous activities
- **Ollama Dependency**: Requires Ollama to be installed and running
- **Limited Automations**: No N8N workflow integration yet
- **Basic Notifications**: Only simple morning nudges implemented
- **Single Day View**: No multi-day timeline visualization
- **Limited Customization**: Fixed session categories and limited color options

---

## Next Phase Preview

Phase 3 (Enhancement) will add:
- Advanced timeline features (multi-day view, pattern analysis)
- N8N automation workflow integration
- Improved AI accuracy with user feedback learning
- Advanced settings and customization options
- Better error handling and user feedback
- Performance optimizations for large datasets

---

*This MVP phase transforms FocusFlare from a basic activity logger into an intelligent focus companion that provides meaningful insights while respecting user privacy and autonomy.* 