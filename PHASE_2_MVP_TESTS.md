# Phase 2 MVP Testing Guide
*Comprehensive test plan for FocusFlare Phase 2 MVP implementation*

## 🎯 Quick Start Testing Checklist

### **Essential Tests (30 minutes)**
1. **AI Classification Test** - Verify Ollama integration works
2. **Timeline Visualization** - Check dashboard displays sessions correctly  
3. **Session Correction** - Test label correction functionality
4. **System Tray** - Verify quick access and controls
5. **Settings Panel** - Check preference configuration

---

## 📋 Detailed Test Procedures

### **1. Local AI Integration Testing**

#### **Test 1.1: Basic AI Classification**
**Setup**: 
- Ensure Ollama is running (`http://localhost:11434`)
- Llama 3.2 model installed (`ollama pull llama3.2:3b`)

**Steps**:
1. Start FocusFlare application
2. Open different applications for 10 minutes each:
   - Code editor (VS Code/Notepad++)
   - Web browser (research tabs)
   - Entertainment app (YouTube/games)
   - Document editor (Word/Google Docs)
3. Wait 2-3 minutes for AI processing
4. Check dashboard for classified sessions

**Expected Results**:
- Sessions appear with appropriate labels (focused-work, research, entertainment)
- AI processing completes within 30 seconds
- No application crashes during classification

**Validation**:
```bash
# Check Ollama is responding
curl http://localhost:11434/api/version

# Check FocusFlare logs for AI requests
# Look in app data directory for logs
```

#### **Test 1.2: AI Error Handling**
**Steps**:
1. Stop Ollama service (`killall ollama` or Task Manager)
2. Use FocusFlare normally for 10 minutes
3. Check app continues functioning
4. Restart Ollama and verify classification resumes

**Expected Results**:
- App doesn't crash when Ollama unavailable
- Activities still logged with "unclear" classification
- Classification resumes when Ollama returns

---

### **2. Timeline Dashboard Testing**

#### **Test 2.1: Timeline Visualization**
**Steps**:
1. Generate 2-3 hours of varied activity
2. Open dashboard timeline view
3. Check visual session representation
4. Test interactive features

**Expected Results**:
- Color-coded session blocks displayed
- Sessions proportional to actual duration
- Hover tooltips show session details
- Click opens session detail modal

#### **Test 2.2: Timeline Controls**
**Steps**:
1. Test date navigation (previous/next day)
2. Apply session type filters
3. Resize window to test responsiveness
4. Test zoom/scroll if implemented

**Expected Results**:
- Smooth navigation between dates
- Filters show/hide appropriate sessions
- Timeline adapts to window size changes
- Controls remain functional and accessible

---

### **3. Session Label Correction Testing**

#### **Test 3.1: Manual Correction Interface**
**Steps**:
1. Click on a session block in timeline
2. Open session detail modal
3. Change session label using dropdown
4. Add optional reflection text
5. Save changes

**Expected Results**:
- Modal displays complete session information
- Dropdown shows all session types
- Changes save immediately
- Timeline updates without refresh

#### **Test 3.2: Learning System**
**Steps**:
1. Correct 3-5 session labels with explanations
2. Check database for feedback storage
3. Restart app and verify corrections persist

**Expected Results**:
- Corrections stored permanently
- User feedback saved for AI learning
- Changes visible across app restarts

---

### **4. User Settings Testing**

#### **Test 4.1: Settings Panel Access**
**Steps**:
1. Access settings from system tray
2. Access settings from dashboard
3. Navigate between settings sections
4. Test responsiveness

**Expected Results**:
- Settings accessible from multiple locations
- All sections load properly
- Navigation smooth and intuitive

#### **Test 4.2: Preference Configuration**
**Steps**:
1. Set custom work hours (e.g., 9 AM - 6 PM)
2. Configure session colors
3. Set data retention period
4. Save and verify settings apply

**Expected Results**:
- All settings save correctly
- Changes reflect immediately in UI
- Settings persist across restarts

---

### **5. System Tray Testing**

#### **Test 5.1: Tray Menu and Controls**
**Steps**:
1. Right-click system tray icon
2. Check menu options and stats
3. Test pause/resume monitoring
4. Access dashboard from tray

**Expected Results**:
- Menu shows current session info
- Quick stats accurate (focus time, current session)
- Pause/resume works immediately
- Dashboard opens directly

#### **Test 5.2: Tray Notifications**
**Steps**:
1. Enable morning notifications in settings
2. Test notification content
3. Test dismissing notifications

**Expected Results**:
- Notifications appear as configured
- Content relevant and helpful
- Easy to dismiss or disable

---

### **6. Session Management Testing**

#### **Test 6.1: Session Boundary Detection**
**Steps**:
1. Work in focused blocks:
   - 30 min coding
   - 10 min break (casual browsing)
   - 20 min research
   - 5 min idle time
2. Check session boundaries in dashboard

**Expected Results**:
- Clear session boundaries between activities
- Idle time detected and handled separately
- Session durations accurate
- Appropriate classifications applied

#### **Test 6.2: Data Persistence**
**Steps**:
1. Generate sessions through normal usage
2. Close and restart FocusFlare
3. Check historical data accuracy

**Expected Results**:
- All sessions persist across restarts
- No data loss or corruption
- Historical navigation works correctly

---

## 🚀 Performance & Stress Testing

### **Performance Test 1: Resource Usage**
**Monitor during normal operation**:
- Memory usage should stay < 150MB
- CPU usage < 5% when idle, < 20% during AI processing
- Database queries < 100ms for daily data

**Monitoring Commands** (Windows PowerShell):
```powershell
Get-Process "FocusFlare" | Select-Object CPU,WorkingSet
```

### **Performance Test 2: Large Dataset Handling**
**Steps**:
1. Generate extensive activity data (8+ hours)
2. Test timeline rendering performance
3. Navigate between multiple days
4. Apply filters repeatedly

**Expected Results**:
- Timeline renders < 2 seconds for full day
- Navigation between days smooth
- Filtering responsive and fast

---

## 🐛 Error Scenario Testing

### **Error Test 1: Service Failures**
**Test graceful handling of**:
- Ollama service unavailable
- Database file locked/corrupted
- System monitoring API failures

**Expected Behavior**:
- No application crashes
- Clear error messages
- Graceful degradation of features

### **Error Test 2: Resource Constraints**
**Test under**:
- Low disk space
- High system load
- Memory constraints

**Expected Behavior**:
- Appropriate user warnings
- Automatic cleanup if possible
- Stable operation under constraints

---

## 📊 Acceptance Criteria Summary

**Core Functionality**:
- ✅ AI classification works for common activity patterns
- ✅ Timeline displays sessions visually and accurately
- ✅ Session corrections save and update immediately
- ✅ Settings persist and apply correctly
- ✅ System tray provides quick access and control

**Performance**:
- ✅ Memory usage < 150MB during normal operation
- ✅ AI processing < 30 seconds for 8-hour day
- ✅ Timeline rendering < 2 seconds
- ✅ Dashboard loads < 1 second for current day

**User Experience**:
- ✅ Onboarding completes successfully for new users
- ✅ All interactive elements responsive and intuitive
- ✅ Error messages clear and actionable
- ✅ No crashes during normal operation

**Data Integrity**:
- ✅ All sessions and activities persist correctly
- ✅ User corrections saved permanently
- ✅ Historical data remains accurate across restarts

---

## 🎯 Quick Validation Workflow

**15-Minute Smoke Test**:
1. Start FocusFlare → Check system tray appears
2. Use 3 different apps for 5 minutes each → Check activity logging
3. Open dashboard → Verify timeline displays sessions
4. Click session → Test correction modal
5. Change one label → Verify update saves
6. Access settings → Test one preference change
7. Restart app → Confirm data persists

**Pass Criteria**: All steps complete without errors, data displays correctly, changes persist.

---

## 📝 Bug Report Template

```markdown
**Bug Title**: [Brief description]
**Severity**: Critical/High/Medium/Low
**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]
**Environment**: [OS version, app version]
**Additional Info**: [Screenshots, logs, etc.]
```

---

*This test plan ensures Phase 2 MVP delivers a functional, reliable, and user-friendly AI-powered focus tracking experience that meets all specified requirements while maintaining excellent performance and data integrity.* 