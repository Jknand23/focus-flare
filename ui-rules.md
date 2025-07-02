# FocusFlare UI Design Rules & Principles
*"Illuminate your focus. Navigate your day."*

## Overview
This document establishes the core UI design principles for FocusFlare, ensuring a consistent, accessible, and calming user experience that respects attention and promotes mindful productivity. All interface elements should embody our "Minimalist & Customizable Calm" theme philosophy.

---

## 🎯 Core Design Philosophy

### **Respects Attention**
- **Never interrupt focus**: UI elements appear only when user initiates interaction
- **Subtle presence**: Visual elements should be noticeable but never demanding
- **Graceful degradation**: Features work seamlessly even when user ignores them
- **Intentional interactions**: Every UI element serves a clear, specific purpose

### **Minimalist by Design**
- **Essential elements only**: Remove anything that doesn't directly serve the user's goal
- **White space mastery**: Use generous spacing to create breathing room and visual hierarchy
- **Progressive disclosure**: Show only what's needed now, reveal complexity on demand
- **Single-task focus**: Each screen or component focuses on one primary action

### **Customizable Calm**
- **User control**: Every visual element can be personalized without breaking functionality
- **Adaptive interface**: UI adapts to user preferences and usage patterns
- **Gentle feedback**: Interactions provide subtle, positive reinforcement
- **Emotional consistency**: Visual language promotes focus and reduces anxiety

---

## 📐 Responsive Design Guidelines

### **Desktop-First Responsive Strategy**
Since FocusFlare is a Windows desktop application, responsive design focuses on:

#### **Window Sizing Adaptability**
- **Minimum Window Size**: 800px × 600px (supports small laptop screens)
- **Optimal Window Size**: 1200px × 800px (primary design target)
- **Maximum Content Width**: 1400px (prevents over-stretching on ultrawide monitors)
- **Responsive Breakpoints**:
  - `sm`: 640px (compact window mode)
  - `md`: 768px (standard laptop)
  - `lg`: 1024px (desktop standard)
  - `xl`: 1280px (large desktop)
  - `2xl`: 1536px (ultrawide adaptation)

#### **Layout Flexibility**
- **Dashboard Grid**: Use CSS Grid with `minmax()` for flexible column sizing
- **Timeline Visualization**: Horizontal scrolling with fixed height, scales to window width
- **Sidebar Panels**: Collapsible with consistent 280px width when expanded
- **Modal Windows**: Max-width constraints with margin-based centering
- **Content Scaling**: Typography and spacing scale proportionally with window size

#### **Component Responsiveness**
```typescript
// Example responsive timeline component structure
interface TimelineResponsiveProps {
  windowWidth: number;
  compactMode: boolean;
  showSidebar: boolean;
}

// Responsive behavior patterns:
// - Below 768px: Stack timeline vertically, hide secondary info
// - 768px-1024px: Horizontal timeline, abbreviated labels
// - Above 1024px: Full timeline with detailed labels and tooltips
```

---

## ♿ Accessibility Standards

### **Visual Accessibility**
- **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text (WCAG AA)
- **Color Independence**: Never rely solely on color to convey information
- **Focus Indicators**: Clear, high-contrast focus rings on all interactive elements
- **Text Scaling**: Support system font scaling up to 200% without breaking layout
- **Motion Sensitivity**: Respect `prefers-reduced-motion` for all animations

### **Keyboard Navigation**
- **Tab Order**: Logical tab sequence following visual layout
- **Keyboard Shortcuts**: Intuitive shortcuts for primary actions (Ctrl+D for dashboard)
- **Escape Patterns**: ESC key closes modals, cancels actions, returns to previous state
- **Focus Management**: Focus moves appropriately when content changes dynamically
- **Skip Links**: Allow users to skip repetitive navigation elements

### **Screen Reader Support**
- **Semantic HTML**: Use proper heading hierarchy (h1 → h2 → h3)
- **ARIA Labels**: Descriptive labels for complex interactive elements
- **Live Regions**: Announce dynamic content changes (session updates, new data)
- **Alternative Text**: Descriptive alt text for all informational graphics
- **Role Attributes**: Proper ARIA roles for custom components

### **Cognitive Accessibility**
- **Clear Language**: Use simple, direct language avoiding technical jargon
- **Consistent Patterns**: Maintain consistent interaction patterns across the app
- **Error Prevention**: Validate inputs in real-time with helpful guidance
- **Undo Actions**: Provide undo functionality for destructive actions
- **Progress Indicators**: Show progress for any action taking >2 seconds

---

## 🔄 Interaction Patterns

### **Gentle Engagement**
- **Hover States**: Subtle opacity changes (0.8) or soft color shifts
- **Click Feedback**: Brief scale animation (scale-95 → scale-100) lasting 150ms
- **Loading States**: Calm pulsing animations, never jarring spinners
- **Success Feedback**: Soft green checkmarks with gentle fade-in animation
- **Error Handling**: Warm orange/red colors with helpful guidance, not punishment

### **Non-Intrusive Notifications**
- **System Tray Integration**: Primary notification method respects user attention
- **Toast Messages**: Bottom-right positioning, auto-dismiss after 4 seconds
- **Status Indicators**: Subtle dots or badges, never demanding attention
- **Progress Updates**: Background processing shown only when user requests status
- **Celebratory Moments**: Gentle animations for achievements, easily dismissed

### **Contextual Interactions**
- **Right-Click Menus**: Consistent context menus with relevant actions only
- **Drag & Drop**: Intuitive session timeline manipulation with visual feedback
- **Double-Click Actions**: Open detailed views or edit modes
- **Long-Press Support**: Touch-friendly interactions for hybrid devices
- **Gesture Support**: Basic trackpad gestures for timeline navigation

---

## 📱 Component Design Principles

### **Button Design Standards**
- **Primary Actions**: Single primary button per screen, visually prominent
- **Secondary Actions**: Subtle styling, doesn't compete with primary
- **Destructive Actions**: Require confirmation, use warm warning colors
- **Icon Buttons**: 40px minimum touch target, clear hover states
- **Button States**: Disabled, loading, active states clearly differentiated

### **Form Element Guidelines**
- **Input Fields**: Generous padding (12px vertical, 16px horizontal)
- **Labels**: Always visible, positioned above inputs for clarity
- **Validation**: Real-time validation with gentle color coding
- **Field Groups**: Logical grouping with subtle borders or spacing
- **Error Messages**: Positioned directly below relevant fields

### **Data Visualization Standards**
- **Timeline Charts**: Clean, minimalist styling with subtle grid lines
- **Color Coding**: Intuitive color associations (green = productive, blue = neutral)
- **Interactive Elements**: Clear hover states showing additional context
- **Zoom Controls**: Subtle controls that don't interfere with data viewing
- **Legend Positioning**: Consistent placement, easily scannable

### **Navigation Patterns**
- **Breadcrumbs**: Simple, text-based navigation showing current location
- **Tab Navigation**: Minimal styling, clear active state indication
- **Sidebar Navigation**: Collapsible, with clear section organization
- **Back Navigation**: Consistent back button placement and behavior
- **Search Integration**: Prominent search with instant filtering capabilities

---

## 🎨 Animation & Motion Guidelines

### **Purposeful Animation**
- **Duration Standards**: 
  - Micro-interactions: 150ms (hover, click feedback)
  - Transitions: 250ms (page changes, modal open/close)  
  - Complex animations: 400ms maximum (timeline updates, data changes)
- **Easing Functions**: Use natural easing (ease-out) for most interactions
- **Performance**: All animations must maintain 60fps, hardware accelerated when possible

### **Emotional Design Through Motion**
- **Entry Animations**: Gentle fade-in + slight upward movement (translate-y-2)
- **Exit Animations**: Quick fade-out, no distracting movement
- **Success States**: Brief scale pulse (scale-105) with soft green highlight
- **Loading States**: Smooth, continuous motion suggesting progress
- **Error States**: Subtle shake animation (2px) to draw attention without alarming

### **Reduced Motion Support**
```css
/* Always include reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 📋 Layout & Composition Rules

### **Grid System Standards**
- **Base Grid**: 12-column grid with 24px gutters
- **Container Widths**: Max 1200px for content, full-width for background elements
- **Vertical Rhythm**: 8px base unit for all spacing decisions
- **Component Spacing**: Consistent margins using Tailwind's spacing scale

### **Typography Hierarchy**
- **Heading Levels**: Maximum 4 levels (h1, h2, h3, h4) with clear size distinction
- **Body Text**: Comfortable reading line-height (1.6) with optimal character count
- **Code Elements**: Monospace font with subtle background highlighting
- **Interactive Text**: Consistent link styling with appropriate contrast
- **Micro-copy**: Smaller text for secondary information, maintaining readability

### **Content Organization**
- **Card-Based Layout**: Group related information in subtle card containers
- **Progressive Disclosure**: Show essential info first, details on demand
- **Scannable Structure**: Use headings, bullets, and white space for easy scanning
- **Content Density**: Balance information density with white space for comfortable viewing
- **Mobile Considerations**: Even on desktop, consider how layouts adapt to narrow windows

---

## 🔍 Usability Principles

### **Discoverability**
- **Visual Hierarchy**: Most important elements are visually prominent
- **Affordances**: Interactive elements look clickable/touchable
- **Consistency**: Similar functions look and behave similarly across the app
- **Feedback**: Every user action produces appropriate system response
- **Help Integration**: Contextual help available without leaving current task

### **Efficiency**
- **Keyboard Shortcuts**: Power users can accomplish tasks quickly
- **Smart Defaults**: Sensible default settings reduce configuration overhead
- **Batch Operations**: Allow multiple items to be processed simultaneously
- **Quick Actions**: Most common tasks accessible within 2 clicks
- **Search & Filter**: Quick ways to find specific information or sessions

### **Error Prevention & Recovery**
- **Input Validation**: Prevent errors before they occur with real-time validation
- **Confirmation Dialogs**: For destructive actions, with clear consequences
- **Undo Functionality**: Easy recovery from mistakes where possible
- **Clear Error Messages**: Explain what went wrong and how to fix it
- **Graceful Degradation**: App remains functional even when features fail

---

## 📏 Implementation Standards

### **Component Documentation**
Every UI component must include:
- **Purpose**: Clear description of what the component does
- **Props Interface**: TypeScript interfaces with JSDoc comments
- **Usage Examples**: Code examples showing proper implementation
- **Accessibility Notes**: ARIA requirements and keyboard interaction patterns
- **Responsive Behavior**: How component adapts to different screen sizes

### **Code Organization**
- **Component Files**: Maximum 500 lines, split complex components into smaller pieces
- **Style Co-location**: Component-specific styles defined near component logic
- **Shared Utilities**: Common UI utilities in dedicated modules
- **Theme Integration**: All components use design tokens, never hardcoded values
- **Performance Considerations**: Memoization and optimization strategies documented

### **Testing Requirements**
- **Visual Testing**: Screenshot testing for critical UI components
- **Interaction Testing**: Automated tests for all user interaction patterns
- **Accessibility Testing**: Automated accessibility scanning and manual testing
- **Responsive Testing**: Verify component behavior across different window sizes
- **Performance Testing**: Monitor render performance and memory usage

---

## ✅ Design Checklist

Before implementing any UI component, verify:
- [ ] **Accessibility**: Meets WCAG AA standards and keyboard navigation requirements
- [ ] **Responsiveness**: Works properly across all defined breakpoints
- [ ] **Theme Integration**: Uses design tokens and supports light/dark themes
- [ ] **Performance**: Renders efficiently and doesn't cause unnecessary re-renders
- [ ] **Documentation**: Includes proper JSDoc comments and usage examples
- [ ] **Error Handling**: Gracefully handles edge cases and error states
- [ ] **Animation**: Respects motion preferences and maintains 60fps performance
- [ ] **Consistency**: Follows established patterns and visual hierarchy
- [ ] **User Testing**: Validated with real users for usability and clarity
- [ ] **Mobile Friendly**: Even on desktop, considers narrow window scenarios

---

*These UI rules serve as the foundation for building FocusFlare's interface, ensuring every interaction reinforces our commitment to respecting user attention while providing powerful, intuitive tools for focus management and self-reflection.* 