# FocusFlare Theme Rules & Design System
*"Minimalist & Customizable Calm"*

## Overview
This document defines the complete visual design system for FocusFlare, establishing color palettes, typography, spacing, and styling rules that create a cohesive "Minimalist & Customizable Calm" experience. All design tokens are built for both light and dark themes with full customization support.

---

## 🎨 Color Philosophy

### **Calm & Focus-Oriented Palette**
Our color system is designed to:
- **Reduce cognitive load** through subtle, harmonious colors
- **Support focus states** with gentle, non-distracting hues
- **Provide clear hierarchy** without visual aggression
- **Maintain accessibility** across all contrast requirements
- **Enable personalization** while preserving usability

---

## 🌈 Core Color Palette

### **Primary Colors (Light Theme)**
```css
:root {
  /* Primary Brand Colors - Soft Blue-Green (Calming Focus) */
  --color-primary-50: #f0f9ff;
  --color-primary-100: #e0f2fe;
  --color-primary-200: #bae6fd;
  --color-primary-300: #7dd3fc;
  --color-primary-400: #38bdf8;
  --color-primary-500: #0ea5e9; /* Primary brand color */
  --color-primary-600: #0284c7;
  --color-primary-700: #0369a1;
  --color-primary-800: #075985;
  --color-primary-900: #0c4a6e;
  
  /* Neutral Colors - Warm Grays (Comfortable Reading) */
  --color-neutral-50: #fafaf9;
  --color-neutral-100: #f5f5f4;
  --color-neutral-200: #e7e5e4;
  --color-neutral-300: #d6d3d1;
  --color-neutral-400: #a8a29e;
  --color-neutral-500: #78716c;
  --color-neutral-600: #57534e;
  --color-neutral-700: #44403c;
  --color-neutral-800: #292524;
  --color-neutral-900: #1c1917;
}
```

### **Primary Colors (Dark Theme)**
```css
:root[data-theme="dark"] {
  /* Primary Brand Colors - Adjusted for dark backgrounds */
  --color-primary-50: #0c1929;
  --color-primary-100: #0f2434;
  --color-primary-200: #1e3a52;
  --color-primary-300: #2d5075;
  --color-primary-400: #3b82f6;
  --color-primary-500: #60a5fa; /* Primary brand color (lighter for dark mode) */
  --color-primary-600: #93c5fd;
  --color-primary-700: #bfdbfe;
  --color-primary-800: #dbeafe;
  --color-primary-900: #eff6ff;
  
  /* Neutral Colors - Cool Grays (Dark Theme) */
  --color-neutral-50: #1a1a1a;
  --color-neutral-100: #262626;
  --color-neutral-200: #404040;
  --color-neutral-300: #525252;
  --color-neutral-400: #737373;
  --color-neutral-500: #a3a3a3;
  --color-neutral-600: #d4d4d4;
  --color-neutral-700: #e5e5e5;
  --color-neutral-800: #f5f5f5;
  --color-neutral-900: #ffffff;
}
```

---

## 🎯 Semantic Color System

### **Focus & Activity State Colors**
```css
:root {
  /* Focus States - Productive Activities */
  --color-focus-light: #dcfce7;    /* Soft green background */
  --color-focus-medium: #16a34a;   /* Focus session color */
  --color-focus-dark: #15803d;     /* Focus border/accent */
  
  /* Research States - Learning Activities */
  --color-research-light: #dbeafe; /* Soft blue background */
  --color-research-medium: #2563eb; /* Research session color */
  --color-research-dark: #1d4ed8;  /* Research border/accent */
  
  /* Break States - Rest Activities */
  --color-break-light: #fef3c7;    /* Soft amber background */
  --color-break-medium: #f59e0b;   /* Break session color */
  --color-break-dark: #d97706;     /* Break border/accent */
  
  /* Entertainment States - Leisure Activities */
  --color-entertainment-light: #fce7f3; /* Soft pink background */
  --color-entertainment-medium: #ec4899; /* Entertainment color */
  --color-entertainment-dark: #db2777;   /* Entertainment accent */
  
  /* Background States - Ambient Activities */
  --color-background-light: #f3f4f6;    /* Neutral gray background */
  --color-background-medium: #9ca3af;   /* Background activity color */
  --color-background-dark: #6b7280;     /* Background accent */
  
  /* Unclear States - Processing/Unknown */
  --color-unclear-light: #e7e5e4;       /* Neutral beige background */
  --color-unclear-medium: #78716c;      /* Unclear session color */
  --color-unclear-dark: #57534e;        /* Unclear accent */
}
```

### **System State Colors**
```css
:root {
  /* Success States - Positive Feedback */
  --color-success-light: #dcfce7;
  --color-success-medium: #22c55e;
  --color-success-dark: #16a34a;
  
  /* Warning States - Gentle Alerts */
  --color-warning-light: #fef3c7;
  --color-warning-medium: #f59e0b;
  --color-warning-dark: #d97706;
  
  /* Error States - Warm, Non-Punitive */
  --color-error-light: #fee2e2;
  --color-error-medium: #ef4444;
  --color-error-dark: #dc2626;
  
  /* Info States - Neutral Information */
  --color-info-light: #dbeafe;
  --color-info-medium: #3b82f6;
  --color-info-dark: #2563eb;
}
```

### **Dark Theme Semantic Adjustments**
```css
:root[data-theme="dark"] {
  /* Focus States - Adjusted for dark backgrounds */
  --color-focus-light: #0f2415;
  --color-focus-medium: #22c55e;
  --color-focus-dark: #4ade80;
  
  /* Research States */
  --color-research-light: #0f1729;
  --color-research-medium: #3b82f6;
  --color-research-dark: #60a5fa;
  
  /* Break States */
  --color-break-light: #2d1b0a;
  --color-break-medium: #f59e0b;
  --color-break-dark: #fbbf24;
  
  /* Entertainment States */
  --color-entertainment-light: #2d1b2d;
  --color-entertainment-medium: #ec4899;
  --color-entertainment-dark: #f472b6;
  
  /* System states adjusted for dark theme */
  --color-success-light: #0f2415;
  --color-warning-light: #2d1b0a;
  --color-error-light: #2d0f0f;
  --color-info-light: #0f1729;
}
```

---

## 📝 Typography System

### **Font Families**
```css
:root {
  /* Primary Font - Clean, Modern Sans-serif */
  --font-family-sans: 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif;
  
  /* Monospace Font - Code and Data Display */
  --font-family-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
  
  /* Display Font - Headings and Emphasis */
  --font-family-display: 'Inter', 'Segoe UI', sans-serif;
}
```

### **Font Sizes & Hierarchy**
```css
:root {
  /* Font Size Scale - Perfect Fourth (1.333) Ratio */
  --text-xs: 0.75rem;     /* 12px - Micro copy, timestamps */
  --text-sm: 0.875rem;    /* 14px - Secondary text, captions */
  --text-base: 1rem;      /* 16px - Body text, default */
  --text-lg: 1.125rem;    /* 18px - Emphasized body text */
  --text-xl: 1.25rem;     /* 20px - Small headings */
  --text-2xl: 1.5rem;     /* 24px - Section headings */
  --text-3xl: 1.875rem;   /* 30px - Page headings */
  --text-4xl: 2.25rem;    /* 36px - Display headings */
  
  /* Line Heights - Optimized for Readability */
  --leading-tight: 1.25;  /* For headings */
  --leading-normal: 1.5;  /* For body text */
  --leading-relaxed: 1.625; /* For long-form content */
  
  /* Font Weights */
  --font-thin: 100;
  --font-light: 300;
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

### **Typography Usage Guidelines**
```css
/* Heading Styles */
.text-heading-1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
  color: var(--color-neutral-900);
  letter-spacing: -0.025em;
}

.text-heading-2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-medium);
  line-height: var(--leading-tight);
  color: var(--color-neutral-800);
  letter-spacing: -0.0125em;
}

.text-heading-3 {
  font-size: var(--text-xl);
  font-weight: var(--font-medium);
  line-height: var(--leading-normal);
  color: var(--color-neutral-700);
}

/* Body Text Styles */
.text-body-large {
  font-size: var(--text-lg);
  font-weight: var(--font-normal);
  line-height: var(--leading-relaxed);
  color: var(--color-neutral-700);
}

.text-body {
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  line-height: var(--leading-normal);
  color: var(--color-neutral-600);
}

.text-body-small {
  font-size: var(--text-sm);
  font-weight: var(--font-normal);
  line-height: var(--leading-normal);
  color: var(--color-neutral-500);
}

/* Special Text Styles */
.text-caption {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  line-height: var(--leading-normal);
  color: var(--color-neutral-400);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.text-code {
  font-family: var(--font-family-mono);
  font-size: 0.875em; /* Relative to parent */
  font-weight: var(--font-normal);
  background-color: var(--color-neutral-100);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}
```

---

## 📏 Spacing System

### **Base Spacing Scale**
```css
:root {
  /* Spacing Scale - 8px Base Unit (Perfect for 8px Grid) */
  --space-0: 0px;
  --space-0_5: 2px;   /* 0.125rem */
  --space-1: 4px;     /* 0.25rem */
  --space-1_5: 6px;   /* 0.375rem */
  --space-2: 8px;     /* 0.5rem */
  --space-2_5: 10px;  /* 0.625rem */
  --space-3: 12px;    /* 0.75rem */
  --space-4: 16px;    /* 1rem */
  --space-5: 20px;    /* 1.25rem */
  --space-6: 24px;    /* 1.5rem */
  --space-8: 32px;    /* 2rem */
  --space-10: 40px;   /* 2.5rem */
  --space-12: 48px;   /* 3rem */
  --space-16: 64px;   /* 4rem */
  --space-20: 80px;   /* 5rem */
  --space-24: 96px;   /* 6rem */
  --space-32: 128px;  /* 8rem */
  --space-40: 160px;  /* 10rem */
  --space-48: 192px;  /* 12rem */
  --space-56: 224px;  /* 14rem */
  --space-64: 256px;  /* 16rem */
}
```

### **Component-Specific Spacing**
```css
:root {
  /* Layout Spacing */
  --spacing-section: var(--space-16);     /* Between major sections */
  --spacing-component: var(--space-8);    /* Between related components */
  --spacing-element: var(--space-4);      /* Between related elements */
  --spacing-tight: var(--space-2);        /* Tight groupings */
  
  /* Padding Standards */
  --padding-button: var(--space-3) var(--space-4);
  --padding-input: var(--space-3) var(--space-4);
  --padding-card: var(--space-6);
  --padding-modal: var(--space-8);
  --padding-page: var(--space-6);
  
  /* Margin Standards */
  --margin-section: var(--space-12);
  --margin-component: var(--space-6);
  --margin-element: var(--space-3);
}
```

---

## 🎭 Component Styling Rules

### **Button Styles**
```css
/* Primary Button - Main Actions */
.btn-primary {
  background-color: var(--color-primary-500);
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  transition: all 150ms ease-out;
  cursor: pointer;
}

.btn-primary:hover {
  background-color: var(--color-primary-600);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Secondary Button - Supporting Actions */
.btn-secondary {
  background-color: transparent;
  color: var(--color-neutral-600);
  border: 1px solid var(--color-neutral-300);
  border-radius: 0.5rem;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  transition: all 150ms ease-out;
  cursor: pointer;
}

.btn-secondary:hover {
  background-color: var(--color-neutral-50);
  border-color: var(--color-neutral-400);
  color: var(--color-neutral-700);
}

/* Ghost Button - Minimal Actions */
.btn-ghost {
  background-color: transparent;
  color: var(--color-neutral-500);
  border: none;
  border-radius: 0.5rem;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  transition: all 150ms ease-out;
  cursor: pointer;
}

.btn-ghost:hover {
  background-color: var(--color-neutral-100);
  color: var(--color-neutral-700);
}
```

### **Card Styles**
```css
/* Base Card Component */
.card {
  background-color: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  border-radius: 0.75rem;
  padding: var(--space-6);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 200ms ease-out;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

/* Interactive Card */
.card-interactive {
  cursor: pointer;
}

.card-interactive:hover {
  border-color: var(--color-primary-300);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* Card Variants */
.card-elevated {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.card-flat {
  box-shadow: none;
  border: 1px solid var(--color-neutral-200);
}
```

### **Form Element Styles**
```css
/* Input Fields */
.input {
  background-color: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-300);
  border-radius: 0.5rem;
  padding: var(--padding-input);
  font-size: var(--text-base);
  color: var(--color-neutral-700);
  transition: all 150ms ease-out;
  width: 100%;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-500), 0.1);
  background-color: white;
}

.input:disabled {
  background-color: var(--color-neutral-100);
  color: var(--color-neutral-400);
  cursor: not-allowed;
}

/* Labels */
.label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-neutral-700);
  margin-bottom: var(--space-1_5);
  display: block;
}

/* Error States */
.input-error {
  border-color: var(--color-error-medium);
  background-color: var(--color-error-light);
}

.input-error:focus {
  box-shadow: 0 0 0 3px rgba(var(--color-error-medium), 0.1);
}

.error-message {
  color: var(--color-error-dark);
  font-size: var(--text-sm);
  margin-top: var(--space-1);
}
```

---

## 📊 Timeline & Data Visualization Styles

### **Session Timeline Colors**
```css
:root {
  /* Session Type Colors - Carefully chosen for distinction and calm */
  --timeline-focus: var(--color-focus-medium);
  --timeline-research: var(--color-research-medium);
  --timeline-break: var(--color-break-medium);
  --timeline-entertainment: var(--color-entertainment-medium);
  --timeline-background: var(--color-background-medium);
  --timeline-unclear: var(--color-unclear-medium);
  
  /* Timeline UI Elements */
  --timeline-grid: var(--color-neutral-200);
  --timeline-axis: var(--color-neutral-400);
  --timeline-labels: var(--color-neutral-600);
  --timeline-hover: rgba(0, 0, 0, 0.05);
}
```

### **Chart Component Styles**
```css
/* Timeline Session Blocks */
.timeline-session {
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 150ms ease-out;
  min-height: 24px;
  position: relative;
}

.timeline-session:hover {
  opacity: 0.8;
  transform: scale(1.02);
  z-index: 10;
}

.timeline-session.selected {
  box-shadow: 0 0 0 2px var(--color-primary-500);
  z-index: 20;
}

/* Session Type Specific Styles */
.session-focus {
  background-color: var(--timeline-focus);
  color: white;
}

.session-research {
  background-color: var(--timeline-research);
  color: white;
}

.session-break {
  background-color: var(--timeline-break);
  color: white;
}

.session-entertainment {
  background-color: var(--timeline-entertainment);
  color: white;
}

.session-background {
  background-color: var(--timeline-background);
  color: white;
  opacity: 0.7; /* Indicates background activity */
}

.session-unclear {
  background-color: var(--timeline-unclear);
  color: white;
  border: 1px dashed var(--color-neutral-400);
}
```

---

## 🌓 Dark Theme Variations

### **Component Adjustments for Dark Theme**
```css
:root[data-theme="dark"] {
  /* Card adjustments */
  .card {
    background-color: var(--color-neutral-100);
    border-color: var(--color-neutral-200);
  }
  
  /* Input adjustments */
  .input {
    background-color: var(--color-neutral-100);
    border-color: var(--color-neutral-200);
    color: var(--color-neutral-800);
  }
  
  .input:focus {
    background-color: var(--color-neutral-50);
  }
  
  /* Button adjustments */
  .btn-secondary {
    color: var(--color-neutral-600);
    border-color: var(--color-neutral-300);
  }
  
  .btn-secondary:hover {
    background-color: var(--color-neutral-200);
    color: var(--color-neutral-700);
  }
  
  .btn-ghost {
    color: var(--color-neutral-500);
  }
  
  .btn-ghost:hover {
    background-color: var(--color-neutral-200);
    color: var(--color-neutral-800);
  }
}
```

---

## 🎛️ Customization System

### **CSS Custom Properties for User Customization**
```css
:root {
  /* Customizable Session Colors - Users can override these */
  --user-focus-color: var(--color-focus-medium);
  --user-research-color: var(--color-research-medium);
  --user-break-color: var(--color-break-medium);
  --user-entertainment-color: var(--color-entertainment-medium);
  --user-background-color: var(--color-background-medium);
  
  /* Customizable Accent Colors */
  --user-accent-primary: var(--color-primary-500);
  --user-accent-secondary: var(--color-neutral-400);
  
  /* Customizable Spacing (for users who prefer tighter/looser layouts) */
  --user-spacing-multiplier: 1; /* Users can adjust from 0.8 to 1.5 */
}

/* Apply user customizations */
.timeline-session.session-focus {
  background-color: var(--user-focus-color);
}

.timeline-session.session-research {
  background-color: var(--user-research-color);
}

/* Spacing customization utility */
.user-spacing {
  margin: calc(var(--space-4) * var(--user-spacing-multiplier));
  padding: calc(var(--space-2) * var(--user-spacing-multiplier));
}
```

### **Predefined Theme Variations**
```css
/* Calm Blue Theme */
:root[data-user-theme="calm-blue"] {
  --user-focus-color: #3b82f6;
  --user-research-color: #06b6d4;
  --user-break-color: #8b5cf6;
  --user-entertainment-color: #ec4899;
  --user-accent-primary: #3b82f6;
}

/* Forest Green Theme */
:root[data-user-theme="forest"] {
  --user-focus-color: #059669;
  --user-research-color: #0d9488;
  --user-break-color: #ca8a04;
  --user-entertainment-color: #dc2626;
  --user-accent-primary: #059669;
}

/* Sunset Warm Theme */
:root[data-user-theme="sunset"] {
  --user-focus-color: #ea580c;
  --user-research-color: #c2410c;
  --user-break-color: #facc15;
  --user-entertainment-color: #e11d48;
  --user-accent-primary: #ea580c;
}
```

---

## 📐 Layout & Grid System

### **Container Sizes**
```css
:root {
  /* Container max-widths for different breakpoints */
  --container-sm: 640px;
  --container-md: 768px;
  --container-lg: 1024px;
  --container-xl: 1280px;
  --container-2xl: 1536px;
  
  /* Dashboard specific containers */
  --dashboard-max-width: 1400px;
  --sidebar-width: 280px;
  --timeline-min-height: 400px;
}
```

### **Grid System**
```css
/* 12-column responsive grid */
.grid {
  display: grid;
  gap: var(--space-6);
  grid-template-columns: repeat(12, 1fr);
}

/* Responsive column spans */
.col-span-1 { grid-column: span 1; }
.col-span-2 { grid-column: span 2; }
.col-span-3 { grid-column: span 3; }
.col-span-4 { grid-column: span 4; }
.col-span-6 { grid-column: span 6; }
.col-span-8 { grid-column: span 8; }
.col-span-12 { grid-column: span 12; }

/* Responsive breakpoint adjustments */
@media (max-width: 768px) {
  .col-span-4 { grid-column: span 6; }
  .col-span-6 { grid-column: span 12; }
  .col-span-8 { grid-column: span 12; }
}
```

---

## 🔧 Implementation Guidelines

### **CSS Variable Usage**
- **Always use CSS custom properties** for colors, spacing, and typography
- **Never hardcode values** that could be part of the design system
- **Provide fallbacks** for older browsers if needed
- **Use calc()** for proportional spacing adjustments

### **Theme Switching Implementation**
```javascript
// Theme switching utility
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('focusflare-theme', theme);
}

function setUserTheme(userTheme) {
  document.documentElement.setAttribute('data-user-theme', userTheme);
  localStorage.setItem('focusflare-user-theme', userTheme);
}

// Initialize theme on app start
function initializeTheme() {
  const theme = localStorage.getItem('focusflare-theme') || 'light';
  const userTheme = localStorage.getItem('focusflare-user-theme') || 'default';
  
  setTheme(theme);
  if (userTheme !== 'default') {
    setUserTheme(userTheme);
  }
}
```

### **Color Contrast Validation**
All color combinations must pass WCAG AA standards:
- **Normal text**: 4.5:1 contrast ratio minimum
- **Large text**: 3:1 contrast ratio minimum
- **Interactive elements**: 3:1 contrast ratio for focus indicators
- **Graphical elements**: 3:1 contrast ratio for meaningful graphics

---

## ✅ Theme Implementation Checklist

Before implementing any themed component:
- [ ] **Uses design tokens**: All colors, spacing, and typography use CSS custom properties
- [ ] **Supports dark theme**: Component works properly in both light and dark themes
- [ ] **Accessible contrast**: All color combinations meet WCAG AA standards
- [ ] **Customizable elements**: User-customizable colors use appropriate CSS variables
- [ ] **Responsive scaling**: Typography and spacing scale appropriately across window sizes
- [ ] **Consistent patterns**: Follows established component styling patterns
- [ ] **Performance optimized**: CSS is efficient and doesn't cause unnecessary reflows
- [ ] **Documentation complete**: Component includes theme usage examples and guidelines

---

*This theme system provides the foundation for FocusFlare's calming, minimalist interface while maintaining full customization capabilities and accessibility standards. Every design decision reinforces our commitment to creating a focused, non-intrusive user experience.* 