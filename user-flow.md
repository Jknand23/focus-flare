# FocusFlare User Flow Documentation
*"Illuminate your focus. Navigate your day."*

## Overview
This document outlines the complete user journey through FocusFlare, mapping how users interact with different features and how they connect to create a cohesive experience. The flow is designed around minimal friction, privacy-first principles, and gentle guidance rather than intrusive notifications.

---

## 1. First-Time User Experience & Onboarding

### 1.1 Initial Launch
**Entry Point:** User installs and launches FocusFlare for the first time

**Flow:**
1. **Welcome Screen** - Brief introduction to FocusFlare's purpose
2. **Privacy Notice** - Clear explanation that all data stays local
3. **Basic Preferences Setup:**
   - **Daily Work Goal:** Set target hours for focused work (default: 6 hours)
   - **App Exclusions:** Select applications to exclude from monitoring (e.g., password managers, system utilities)
   - **Work Schedule:** Define typical work hours for context (optional)
   - **Break Preferences:** Set ideal break intervals (default: every 90 minutes)
   - **Visual Preferences:** Choose color scheme for session labels
4. **Permission Requests:** Request necessary system permissions for activity monitoring
5. **Background Setup:** Explain that FocusFlare will now run silently in the system tray
6. **First Day Instructions:** Brief explanation of how to access dashboard and what to expect

**Suggested Additional Onboarding Elements:**
- **Focus Categories Setup:** Allow users to define their own work categories (e.g., "Writing", "Research", "Meetings")
- **Notification Preferences:** Set preference for morning gentle nudges
- **Data Retention Settings:** Choose how long to keep detailed logs (default: 30 days)

---

## 2. Daily Background Operation

### 2.1 Silent Monitoring Phase
**Entry Point:** User begins their day working on their computer

**Flow:**
1. **Automatic Launch:** FocusFlare starts with system boot (if enabled)
2. **System Tray Presence:** Quiet icon appears in system tray
3. **Passive Data Collection:** 
   - Logs active windows and user-interactive applications
   - Monitors background audio/video activity (music, videos playing while working)
   - Tracks session durations and idle periods
   - Detects context switches between user activities
   - Ignores system background processes (updates, maintenance, etc.)
4. **Real-Time AI Processing:** Background AI continuously labels sessions as data comes in
5. **No User Interruption:** Zero notifications or popups during work

---

## 3. Morning Gentle Nudge Flow

### 3.1 Daily Check-In Prompt
**Entry Point:** User's first significant computer activity when both conditions are met:
- 4+ hours of inactivity AND
- Current time is past 6:00 AM

**Flow:**
1. **Gentle Notification:** Small, non-intrusive system tray balloon appears
   - Message: "Good morning! Yesterday's FocusFlare is ready to review ✨"
   - Auto-dismisses after 10 seconds
   - Can be permanently disabled in settings
2. **Optional Immediate Access:** Click notification to open dashboard
3. **Deferred Access:** User can ignore and access dashboard later

---

## 4. System Tray Interactions

### 4.1 Quick Access Menu
**Entry Point:** User right-clicks FocusFlare system tray icon

**Menu Options:**
- **Open Dashboard** - Opens main summary view
- **Quick Stats** - Shows tooltip with:
  - Today's total focused work time
  - Time since last break
  - Current session duration
- **Settings** - Opens configuration panel
- **Pause/Resume Monitoring** - Temporary pause toggle
- **Exit FocusFlare**

### 4.2 Quick Stats Hover
**Entry Point:** User hovers over system tray icon

**Display:**
- Small tooltip showing current session info
- Time spent on current task
- Session label (if determined)

---

## 5. Dashboard Access & Review Flow

### 5.1 Main Dashboard Entry
**Entry Point:** User opens dashboard (typically twice per day)

**Primary Views:**
1. **Visual Timeline View:**
   - Color-coded blocks representing different sessions
   - Foreground vs background activity distinction
   - Clickable blocks for detailed session info

2. **At-a-Glance Metrics:**
   - Total focused work time
   - Research & reading time
   - Entertainment time
   - Break time distribution
   - Time since last break indicator
   - Small win recognition display

3. **Session Management:**
   - Filter controls (show/hide session types)
   - Group by application or time blocks
   - Search functionality for specific activities

---

## 6. Label Correction & Learning Flow

### 6.1 Session Review Process
**Entry Point:** User notices incorrectly labeled session in dashboard

**Flow:**
1. **Session Selection:** User clicks on session block
2. **Label Options:** Dropdown menu appears with:
   - Focused Work
   - Research & Reading
   - Entertainment
   - Background Audio/Video
   - Break Time
   - Unclear (currently being processed)
   - Unlabeled (default for unprocessed sessions)
3. **Label Update:** User selects correct label
4. **Immediate Feedback:** Visual update confirms change

### 6.2 Reflection Prompt Flow
**Entry Point:** User corrects a label that was NOT "Unlabeled" or "Unclear"

**Flow:**
1. **Gentle Prompt Appears:** Small, optional dialog box:
   - "What led to this change?" or "How would you describe this activity?"
   - Text input field (optional)
   - "Skip" and "Share Insight" buttons
2. **User Response Options:**
   - **Skip:** Close dialog, correction saved
   - **Share Insight:** Brief text input helps AI learn
3. **Learning Integration:** AI incorporates feedback for future classification
4. **Positive Reinforcement:** Brief confirmation message thanking user for the insight

---

## 7. Automation Setup Flow

### 7.1 Accessing Automations
**Entry Point:** User opens FocusFlare Settings > Automations tab

**Flow:**
1. **Automation Recipes List:** Display of available templates:
   - Daily summary reminder
   - File organization by active app
   - Calendar integration
   - Custom workflow options
2. **Recipe Selection:** User clicks on desired template
3. **Configuration Form:** FocusFlare-themed form appears with:
   - Basic parameters (time, folder paths, etc.)
   - Simple toggle options
   - Preview of what automation will do
4. **Enable/Save:** User saves configuration
5. **Background Setup:** FocusFlare transparently configures internal N8N instance
6. **Status Confirmation:** User sees automation is active in list

### 7.2 Automation Management
**Ongoing Access:** Through Settings > Automations

**Available Actions:**
- Enable/disable individual automations
- Edit automation parameters
- View automation logs/history
- Add custom automations (advanced users)

---

## 8. Settings & Customization Flow

### 8.1 Settings Access
**Entry Point:** User accesses via system tray menu or dashboard

**Settings Categories:**
1. **General:**
   - Work hour goals
   - Break preferences
   - Data retention settings

2. **Monitoring:**
   - App inclusion/exclusion lists
   - Sensitivity settings
   - Idle time thresholds

3. **Visual:**
   - Color scheme customization
   - Timeline display preferences
   - Dashboard layout options

4. **Privacy:**
   - Monitoring pause schedules
   - Data deletion tools

5. **Automations:**
   - Automation recipes management
   - Custom workflow builder

6. **Notifications:**
   - Morning nudge preferences
   - Achievement celebration settings

---

## 9. Typical Daily User Journey

### Morning (First Computer Use)
1. **System Start:** FocusFlare launches silently
2. **Gentle Nudge:** Brief notification about yesterday's summary
3. **Optional Review:** User may open dashboard to review previous day
4. **Work Begins:** Passive monitoring starts automatically

### During Work Hours
1. **Transparent Operation:** User works normally, unaware of monitoring
2. **Quick Check:** Occasional hover over system tray for current stats
3. **Break Detection:** FocusFlare notes idle periods and transitions

### Evening/End of Work
1. **Continuous Logging:** Sessions accumulate throughout day
2. **No Forced Review:** User not prompted to review immediately
3. **Background Processing:** AI continues classifying sessions

### Next Morning Review Cycle
1. **Dashboard Access:** User opens yesterday's summary
2. **Timeline Review:** Scans color-coded timeline for patterns
3. **Label Corrections:** Updates any misclassified sessions
4. **Insight Sharing:** Optionally provides context for corrections
5. **Pattern Recognition:** Notes trends and celebrates wins

---

## Key Design Principles Reflected in Flow

- **Minimal Friction:** Maximum of 2 clicks to access any feature
- **Privacy-First:** All data processing happens locally
- **Non-Intrusive:** Never forces user interaction
- **Gentle Guidance:** Positive reinforcement over criticism  
- **User Control:** All features can be customized or disabled
- **Contextual Intelligence:** AI learns from user feedback without being pushy
- **Modular Design:** Features work independently but enhance each other

---

*This user flow serves as the foundation for building FocusFlare's architecture and UI elements, ensuring a cohesive and user-centered experience that respects attention and promotes mindful productivity.* 