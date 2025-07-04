/**
 * Theme Manager - Comprehensive theme system for FocusFlare
 * 
 * Manages multiple built-in themes, custom user themes, and provides accessibility
 * features. Handles theme creation, validation, persistence, and application to
 * the DOM. Supports dynamic theme switching and color contrast validation.
 * 
 * @module ThemeManager
 * @author FocusFlare Team
 * @since 0.3.0
 */

import { useSettingsStore } from '@/renderer/stores/settings-store';

// === THEME TYPES ===

/**
 * Color definition with semantic naming
 */
export interface ThemeColor {
  /** Primary color value (hex) */
  value: string;
  /** Optional description */
  description?: string;
}

/**
 * Complete theme color palette
 */
export interface ThemeColors {
  // Base colors
  background: ThemeColor;
  foreground: ThemeColor;
  card: ThemeColor;
  cardForeground: ThemeColor;
  popover: ThemeColor;
  popoverForeground: ThemeColor;
  
  // Brand colors
  primary: ThemeColor;
  primaryForeground: ThemeColor;
  secondary: ThemeColor;
  secondaryForeground: ThemeColor;
  
  // UI colors
  muted: ThemeColor;
  mutedForeground: ThemeColor;
  accent: ThemeColor;
  accentForeground: ThemeColor;
  destructive: ThemeColor;
  destructiveForeground: ThemeColor;
  
  // Form colors
  border: ThemeColor;
  input: ThemeColor;
  ring: ThemeColor;
  
  // Session colors
  sessions: {
    'focused-work': ThemeColor;
    'research': ThemeColor;
    'entertainment': ThemeColor;
    'break': ThemeColor;
    'unclear': ThemeColor;
  };
}

/**
 * Theme definition
 */
export interface Theme {
  /** Unique theme identifier */
  id: string;
  /** Display name */
  name: string;
  /** Theme description */
  description: string;
  /** Theme type */
  type: 'light' | 'dark' | 'high-contrast';
  /** Whether this is a built-in theme */
  isBuiltIn: boolean;
  /** Color palette */
  colors: ThemeColors;
  /** Creation timestamp */
  createdAt: Date;
  /** Last modified timestamp */
  updatedAt: Date;
}

/**
 * Theme validation result
 */
export interface ThemeValidationResult {
  /** Whether theme is valid */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Accessibility warnings */
  warnings: string[];
  /** Contrast ratio results */
  contrastResults: Array<{
    colorPair: string;
    ratio: number;
    passes: boolean;
    level: 'AA' | 'AAA';
  }>;
}

/**
 * Theme manager options
 */
export interface ThemeManagerOptions {
  /** Whether to auto-apply themes */
  autoApply?: boolean;
  /** Whether to validate themes */
  enableValidation?: boolean;
  /** Storage key for custom themes */
  storageKey?: string;
}

// === BUILT-IN THEMES ===

/**
 * Built-in light theme with improved readability
 */
const LIGHT_THEME: Theme = {
  id: 'light',
  name: 'Light',
  description: 'Clean light theme with high contrast',
  type: 'light',
  isBuiltIn: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  colors: {
    background: { value: '#ffffff', description: 'Main background' },
    foreground: { value: '#1a1a1a', description: 'Main text' },
    card: { value: '#ffffff', description: 'Card background' },
    cardForeground: { value: '#1a1a1a', description: 'Card text' },
    popover: { value: '#ffffff', description: 'Popover background' },
    popoverForeground: { value: '#1a1a1a', description: 'Popover text' },
    
    primary: { value: '#2563eb', description: 'Primary brand color' },
    primaryForeground: { value: '#ffffff', description: 'Primary text' },
    secondary: { value: '#f1f5f9', description: 'Secondary background' },
    secondaryForeground: { value: '#0f172a', description: 'Secondary text' },
    
    muted: { value: '#f8fafc', description: 'Muted background' },
    mutedForeground: { value: '#64748b', description: 'Muted text' },
    accent: { value: '#f1f5f9', description: 'Accent background' },
    accentForeground: { value: '#0f172a', description: 'Accent text' },
    destructive: { value: '#dc2626', description: 'Error/danger color' },
    destructiveForeground: { value: '#ffffff', description: 'Error text' },
    
    border: { value: '#e2e8f0', description: 'Border color' },
    input: { value: '#e2e8f0', description: 'Input border' },
    ring: { value: '#2563eb', description: 'Focus ring' },
    
    sessions: {
      'focused-work': { value: '#059669', description: 'Focused work sessions' },
      'research': { value: '#2563eb', description: 'Research sessions' },
      'entertainment': { value: '#dc2626', description: 'Entertainment sessions' },
      'break': { value: '#7c3aed', description: 'Break sessions' },
      'unclear': { value: '#6b7280', description: 'Unclear sessions' }
    }
  }
};

/**
 * Built-in dark theme with improved readability
 */
const DARK_THEME: Theme = {
  id: 'dark',
  name: 'Dark',
  description: 'Comfortable dark theme with proper contrast',
  type: 'dark',
  isBuiltIn: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  colors: {
    background: { value: '#0f172a', description: 'Main background' },
    foreground: { value: '#f8fafc', description: 'Main text' },
    card: { value: '#1e293b', description: 'Card background' },
    cardForeground: { value: '#f8fafc', description: 'Card text' },
    popover: { value: '#1e293b', description: 'Popover background' },
    popoverForeground: { value: '#f8fafc', description: 'Popover text' },
    
    primary: { value: '#3b82f6', description: 'Primary brand color' },
    primaryForeground: { value: '#f8fafc', description: 'Primary text' },
    secondary: { value: '#334155', description: 'Secondary background' },
    secondaryForeground: { value: '#f8fafc', description: 'Secondary text' },
    
    muted: { value: '#1e293b', description: 'Muted background' },
    mutedForeground: { value: '#94a3b8', description: 'Muted text' },
    accent: { value: '#334155', description: 'Accent background' },
    accentForeground: { value: '#f8fafc', description: 'Accent text' },
    destructive: { value: '#ef4444', description: 'Error/danger color' },
    destructiveForeground: { value: '#f8fafc', description: 'Error text' },
    
    border: { value: '#334155', description: 'Border color' },
    input: { value: '#334155', description: 'Input border' },
    ring: { value: '#3b82f6', description: 'Focus ring' },
    
    sessions: {
      'focused-work': { value: '#10b981', description: 'Focused work sessions' },
      'research': { value: '#3b82f6', description: 'Research sessions' },
      'entertainment': { value: '#ef4444', description: 'Entertainment sessions' },
      'break': { value: '#8b5cf6', description: 'Break sessions' },
      'unclear': { value: '#9ca3af', description: 'Unclear sessions' }
    }
  }
};

/**
 * Built-in high contrast theme for accessibility
 */
const HIGH_CONTRAST_THEME: Theme = {
  id: 'high-contrast',
  name: 'High Contrast',
  description: 'High contrast theme for accessibility',
  type: 'high-contrast',
  isBuiltIn: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  colors: {
    background: { value: '#000000', description: 'Main background' },
    foreground: { value: '#ffffff', description: 'Main text' },
    card: { value: '#1a1a1a', description: 'Card background' },
    cardForeground: { value: '#ffffff', description: 'Card text' },
    popover: { value: '#1a1a1a', description: 'Popover background' },
    popoverForeground: { value: '#ffffff', description: 'Popover text' },
    
    primary: { value: '#ffffff', description: 'Primary brand color' },
    primaryForeground: { value: '#000000', description: 'Primary text' },
    secondary: { value: '#333333', description: 'Secondary background' },
    secondaryForeground: { value: '#ffffff', description: 'Secondary text' },
    
    muted: { value: '#1a1a1a', description: 'Muted background' },
    mutedForeground: { value: '#cccccc', description: 'Muted text' },
    accent: { value: '#333333', description: 'Accent background' },
    accentForeground: { value: '#ffffff', description: 'Accent text' },
    destructive: { value: '#ff6b6b', description: 'Error/danger color' },
    destructiveForeground: { value: '#000000', description: 'Error text' },
    
    border: { value: '#666666', description: 'Border color' },
    input: { value: '#666666', description: 'Input border' },
    ring: { value: '#ffffff', description: 'Focus ring' },
    
    sessions: {
      'focused-work': { value: '#00ff00', description: 'Focused work sessions' },
      'research': { value: '#0080ff', description: 'Research sessions' },
      'entertainment': { value: '#ff4444', description: 'Entertainment sessions' },
      'break': { value: '#ff8800', description: 'Break sessions' },
      'unclear': { value: '#888888', description: 'Unclear sessions' }
    }
  }
};

// === THEME MANAGER CLASS ===

/**
 * Theme manager for handling theme operations
 */
export class ThemeManager {
  private options: ThemeManagerOptions;
  private customThemes: Map<string, Theme> = new Map();
  private currentTheme: Theme | null = null;
  private storageKey: string;

  constructor(options: ThemeManagerOptions = {}) {
    this.options = {
      autoApply: true,
      enableValidation: true,
      storageKey: 'focusflare-custom-themes',
      ...options
    };
    this.storageKey = this.options.storageKey!;
    this.loadCustomThemes();
  }

  // === THEME RETRIEVAL ===

  /**
   * Get all available themes (built-in + custom)
   */
  getAllThemes(): Theme[] {
    const builtInThemes = [LIGHT_THEME, DARK_THEME, HIGH_CONTRAST_THEME];
    const customThemes = Array.from(this.customThemes.values());
    return [...builtInThemes, ...customThemes];
  }

  /**
   * Get theme by ID
   */
  getTheme(id: string): Theme | null {
    // Check built-in themes first
    const builtInThemes = [LIGHT_THEME, DARK_THEME, HIGH_CONTRAST_THEME];
    const builtIn = builtInThemes.find(theme => theme.id === id);
    if (builtIn) return builtIn;

    // Check custom themes
    return this.customThemes.get(id) || null;
  }

  /**
   * Get current active theme
   */
  getCurrentTheme(): Theme | null {
    return this.currentTheme;
  }

  /**
   * Get built-in themes only
   */
  getBuiltInThemes(): Theme[] {
    return [LIGHT_THEME, DARK_THEME, HIGH_CONTRAST_THEME];
  }

  /**
   * Get custom themes only
   */
  getCustomThemes(): Theme[] {
    return Array.from(this.customThemes.values());
  }

  // === THEME APPLICATION ===

  /**
   * Apply theme to DOM
   */
  applyTheme(themeId: string): boolean {
    const theme = this.getTheme(themeId);
    if (!theme) {
      console.error(`Theme '${themeId}' not found`);
      return false;
    }

    // Validate theme if enabled
    if (this.options.enableValidation) {
      const validation = this.validateTheme(theme);
      if (!validation.isValid) {
        console.warn(`Theme '${themeId}' has validation errors:`, validation.errors);
      }
    }

    // Apply theme to DOM
    this.applyThemeToDOM(theme);
    this.currentTheme = theme;

    // Note: Settings update is handled by ThemeProvider to prevent infinite loops

    return true;
  }

  /**
   * Apply theme colors to DOM root
   */
  private applyThemeToDOM(theme: Theme): void {
    const root = document.documentElement;
    
    // Set theme attribute
    root.setAttribute('data-theme', theme.type);
    root.setAttribute('data-theme-id', theme.id);

    // Apply CSS custom properties
    const colors = theme.colors;
    
    // Base colors
    root.style.setProperty('--background', this.hexToHsl(colors.background.value));
    root.style.setProperty('--foreground', this.hexToHsl(colors.foreground.value));
    root.style.setProperty('--card', this.hexToHsl(colors.card.value));
    root.style.setProperty('--card-foreground', this.hexToHsl(colors.cardForeground.value));
    root.style.setProperty('--popover', this.hexToHsl(colors.popover.value));
    root.style.setProperty('--popover-foreground', this.hexToHsl(colors.popoverForeground.value));
    
    // Brand colors
    root.style.setProperty('--primary', this.hexToHsl(colors.primary.value));
    root.style.setProperty('--primary-foreground', this.hexToHsl(colors.primaryForeground.value));
    root.style.setProperty('--secondary', this.hexToHsl(colors.secondary.value));
    root.style.setProperty('--secondary-foreground', this.hexToHsl(colors.secondaryForeground.value));
    
    // UI colors
    root.style.setProperty('--muted', this.hexToHsl(colors.muted.value));
    root.style.setProperty('--muted-foreground', this.hexToHsl(colors.mutedForeground.value));
    root.style.setProperty('--accent', this.hexToHsl(colors.accent.value));
    root.style.setProperty('--accent-foreground', this.hexToHsl(colors.accentForeground.value));
    root.style.setProperty('--destructive', this.hexToHsl(colors.destructive.value));
    root.style.setProperty('--destructive-foreground', this.hexToHsl(colors.destructiveForeground.value));
    
    // Form colors
    root.style.setProperty('--border', this.hexToHsl(colors.border.value));
    root.style.setProperty('--input', this.hexToHsl(colors.input.value));
    root.style.setProperty('--ring', this.hexToHsl(colors.ring.value));
    
    // Session colors
    root.style.setProperty('--session-focused-work', colors.sessions['focused-work'].value);
    root.style.setProperty('--session-research', colors.sessions['research'].value);
    root.style.setProperty('--session-entertainment', colors.sessions['entertainment'].value);
    root.style.setProperty('--session-break', colors.sessions['break'].value);
    root.style.setProperty('--session-unclear', colors.sessions['unclear'].value);
  }

  // === CUSTOM THEME MANAGEMENT ===

  /**
   * Create a new custom theme
   */
  createCustomTheme(
    name: string,
    description: string,
    baseTheme: Theme,
    colorOverrides: Partial<ThemeColors> = {}
  ): Theme {
    const customTheme: Theme = {
      id: `custom-${Date.now()}`,
      name,
      description,
      type: baseTheme.type,
      isBuiltIn: false,
      colors: {
        ...baseTheme.colors,
        ...colorOverrides
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.customThemes.set(customTheme.id, customTheme);
    this.saveCustomThemes();

    return customTheme;
  }

  /**
   * Update existing custom theme
   */
  updateCustomTheme(
    themeId: string,
    updates: Partial<Omit<Theme, 'id' | 'isBuiltIn' | 'createdAt'>>
  ): boolean {
    const theme = this.customThemes.get(themeId);
    if (!theme || theme.isBuiltIn) {
      return false;
    }

    const updatedTheme: Theme = {
      ...theme,
      ...updates,
      updatedAt: new Date()
    };

    this.customThemes.set(themeId, updatedTheme);
    this.saveCustomThemes();

    // Re-apply if this is the current theme
    if (this.currentTheme?.id === themeId) {
      this.applyTheme(themeId);
    }

    return true;
  }

  /**
   * Delete custom theme
   */
  deleteCustomTheme(themeId: string): boolean {
    const theme = this.customThemes.get(themeId);
    if (!theme || theme.isBuiltIn) {
      return false;
    }

    this.customThemes.delete(themeId);
    this.saveCustomThemes();

    // Switch to default theme if this was current
    if (this.currentTheme?.id === themeId) {
      this.applyTheme('light');
    }

    return true;
  }

  // === THEME VALIDATION ===

  /**
   * Validate theme for accessibility and correctness
   */
  validateTheme(theme: Theme): ThemeValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const contrastResults: Array<{
      colorPair: string;
      ratio: number;
      passes: boolean;
      level: 'AA' | 'AAA';
    }> = [];

    // Check required colors
    const requiredColors = ['background', 'foreground', 'primary', 'primaryForeground'];
    for (const colorKey of requiredColors) {
      if (!theme.colors[colorKey as keyof ThemeColors]) {
        errors.push(`Missing required color: ${colorKey}`);
      }
    }

    // Check contrast ratios
    const contrastPairs = [
      ['background', 'foreground'],
      ['card', 'cardForeground'],
      ['primary', 'primaryForeground'],
      ['secondary', 'secondaryForeground'],
      ['muted', 'mutedForeground'],
      ['accent', 'accentForeground'],
      ['destructive', 'destructiveForeground']
    ];

    for (const [bg, fg] of contrastPairs) {
      const bgColor = theme.colors[bg as keyof ThemeColors] as ThemeColor;
      const fgColor = theme.colors[fg as keyof ThemeColors] as ThemeColor;
      
      if (bgColor && fgColor) {
        const ratio = this.calculateContrastRatio(bgColor.value, fgColor.value);
        const passesAA = ratio >= 4.5;
        const passesAAA = ratio >= 7;
        
        contrastResults.push({
          colorPair: `${bg}/${fg}`,
          ratio,
          passes: passesAA,
          level: passesAAA ? 'AAA' : 'AA'
        });

        if (!passesAA) {
          warnings.push(`Poor contrast ratio for ${bg}/${fg}: ${ratio.toFixed(2)} (minimum 4.5)`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      contrastResults
    };
  }

  // === UTILITY METHODS ===

  /**
   * Convert hex color to HSL format for CSS custom properties
   */
  private hexToHsl(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  }

  /**
   * Calculate contrast ratio between two colors
   */
  private calculateContrastRatio(color1: string, color2: string): number {
    const getLuminance = (hex: string): number => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const sRGBToLinear = (value: number): number => {
        return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
      };

      const rLinear = sRGBToLinear(r);
      const gLinear = sRGBToLinear(g);
      const bLinear = sRGBToLinear(b);

      return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }

  // === PERSISTENCE ===

  /**
   * Load custom themes from localStorage
   */
  private loadCustomThemes(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const themes = JSON.parse(stored) as Theme[];
        this.customThemes.clear();
        themes.forEach(theme => {
          this.customThemes.set(theme.id, theme);
        });
      }
    } catch (error) {
      console.error('Failed to load custom themes:', error);
    }
  }

  /**
   * Save custom themes to localStorage
   */
  private saveCustomThemes(): void {
    try {
      const themes = Array.from(this.customThemes.values());
      localStorage.setItem(this.storageKey, JSON.stringify(themes));
    } catch (error) {
      console.error('Failed to save custom themes:', error);
    }
  }

  // === EXPORT/IMPORT ===

  /**
   * Export theme to JSON
   */
  exportTheme(themeId: string): string | null {
    const theme = this.getTheme(themeId);
    if (!theme) return null;

    return JSON.stringify(theme, null, 2);
  }

  /**
   * Import theme from JSON
   */
  importTheme(json: string): Theme | null {
    try {
      const theme = JSON.parse(json) as Theme;
      
      // Validate imported theme
      const validation = this.validateTheme(theme);
      if (!validation.isValid) {
        console.error('Invalid theme import:', validation.errors);
        return null;
      }

      // Generate new ID for imported theme
      const importedTheme: Theme = {
        ...theme,
        id: `imported-${Date.now()}`,
        isBuiltIn: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.customThemes.set(importedTheme.id, importedTheme);
      this.saveCustomThemes();

      return importedTheme;
    } catch (error) {
      console.error('Failed to import theme:', error);
      return null;
    }
  }
}

// === SINGLETON INSTANCE ===

/**
 * Global theme manager instance
 */
export const themeManager = new ThemeManager();

// === UTILITY FUNCTIONS ===

/**
 * Get theme manager instance
 */
export function getThemeManager(): ThemeManager {
  return themeManager;
}

/**
 * Quick theme application function
 */
export function applyTheme(themeId: string): boolean {
  return themeManager.applyTheme(themeId);
}

/**
 * Get all available themes
 */
export function getAllThemes(): Theme[] {
  return themeManager.getAllThemes();
}

/**
 * Create a new custom theme
 */
export function createCustomTheme(
  name: string,
  description: string,
  baseTheme: Theme,
  colorOverrides: Partial<ThemeColors> = {}
): Theme {
  return themeManager.createCustomTheme(name, description, baseTheme, colorOverrides);
} 