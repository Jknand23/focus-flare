# Phase 2 MVP Quick Test Checklist
*Print this checklist for easy testing validation*

## 🚀 Pre-Test Setup
- [ ] Ollama installed and running (`http://localhost:11434`)
- [ ] Llama 3.2 model downloaded (`ollama pull llama3.2:3b`)
- [ ] FocusFlare application compiled and ready
- [ ] Test environment clean (clear previous data if needed)

---

## ✅ Core Feature Tests (30 mins)

### **1. AI Classification** (5 mins)
- [ ] Start FocusFlare - no crashes
- [ ] Use 3 different app types for 5 mins each
- [ ] Check dashboard shows classified sessions
- [ ] AI processing completes within 30 seconds
- [ ] Sessions labeled appropriately (work/research/entertainment)

### **2. Timeline Dashboard** (10 mins)
- [ ] Dashboard opens and displays timeline
- [ ] Color-coded session blocks visible
- [ ] Session blocks proportional to time spent
- [ ] Hover tooltips show session details
- [ ] Click session opens detail modal
- [ ] Date navigation works (prev/next day)
- [ ] Timeline responsive to window resizing

### **3. Session Correction** (5 mins)
- [ ] Click session block opens modal
- [ ] Modal shows complete session info
- [ ] Dropdown allows label changes
- [ ] Optional reflection text field works
- [ ] Save button updates timeline immediately
- [ ] Changes persist after app restart

### **4. System Tray** (5 mins)
- [ ] System tray icon appears
- [ ] Right-click shows context menu
- [ ] Menu displays current session info
- [ ] Pause/resume monitoring works
- [ ] Dashboard accessible from tray
- [ ] Settings accessible from tray

### **5. Settings Panel** (5 mins)
- [ ] Settings accessible from multiple locations
- [ ] Work hours configuration saves
- [ ] Session color customization works
- [ ] Data retention settings apply
- [ ] All changes persist across restarts

---

## 🔧 Error Handling Tests (10 mins)

### **Service Failures**
- [ ] Stop Ollama → App continues without crashing
- [ ] Activities still logged with "unclear" labels
- [ ] Restart Ollama → Classification resumes
- [ ] Clear error messages displayed to user

### **Data Persistence**
- [ ] Force close app → Data preserved on restart
- [ ] Generate 3+ hours data → All sessions visible
- [ ] Navigate multiple days → Historical data intact

---

## ⚡ Performance Checks (10 mins)

### **Resource Usage**
- [ ] Memory < 150MB during normal operation
- [ ] CPU < 5% when idle
- [ ] CPU < 20% during AI processing
- [ ] Timeline renders < 2 seconds for full day

### **Responsiveness**
- [ ] Dashboard loads < 1 second for current day
- [ ] Settings changes save < 100ms
- [ ] Modal open/close < 200ms
- [ ] No UI freezing during AI processing

---

## 🎯 User Experience (5 mins)

### **Onboarding (if implemented)**
- [ ] Welcome screen appears for new users
- [ ] Permission requests clear and functional
- [ ] Initial setup completes successfully
- [ ] Dashboard walkthrough helpful

### **Daily Workflow**
- [ ] Morning start → System tray appears
- [ ] Continuous monitoring → Activities logged
- [ ] Dashboard review → Sessions accurate
- [ ] Label corrections → Updates smooth

---

## 📊 Pass/Fail Criteria

**MUST PASS (Critical)**:
- [ ] No application crashes during normal use
- [ ] AI classification produces reasonable results
- [ ] Timeline displays sessions visually
- [ ] Session corrections save and update
- [ ] Data persists across app restarts

**SHOULD PASS (High Priority)**:
- [ ] Performance within specified limits
- [ ] Error handling graceful and informative
- [ ] All interactive elements responsive
- [ ] Settings changes apply correctly

**NICE TO HAVE (Medium Priority)**:
- [ ] Smooth animations and transitions
- [ ] Comprehensive onboarding flow
- [ ] Advanced filtering and navigation
- [ ] Detailed tooltips and help text

---

## 🐛 Issues Found
*Use this space to note any bugs or problems*

| Issue | Severity | Description | Steps to Reproduce |
|-------|----------|-------------|-------------------|
| 1 |  |  |  |
| 2 |  |  |  |
| 3 |  |  |  |
| 4 |  |  |  |
| 5 |  |  |  |

---

## 📝 Test Summary

**Date Tested**: ___________  
**Tester**: ___________  
**App Version**: ___________  
**Environment**: ___________

**Overall Result**: 
- [ ] ✅ **PASS** - Ready for Phase 3
- [ ] ⚠️ **CONDITIONAL** - Minor issues need fixing
- [ ] ❌ **FAIL** - Major issues block progression

**Critical Issues Count**: ___  
**High Priority Issues**: ___  
**Medium Priority Issues**: ___

**Notes**:
_________________________________
_________________________________
_________________________________

---

*Time to complete: ~55 minutes total (including setup)* 