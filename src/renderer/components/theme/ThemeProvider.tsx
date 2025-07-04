/**
 * ThemeProvider - Enhanced global theme management for the application
 * 
 * Provides theme context and manages theme application at the document level.
 * Handles light, dark, system, and custom theme preferences. Integrates with
 * the new ThemeManager for advanced theming capabilities including custom
 * themes and accessibility features.
 * 
 * @module ThemeProvider
 * @author FocusFlare Team
 * @since 0.3.0
 */

import React, { useEffect, createContext, useContext } from 'react';
import { useThemeSettings } from '@/renderer/stores/settings-store';
import { themeManager, type Theme } from '@/renderer/theme/theme-manager';

// === TYPES ===

/**
 * Theme context interface
 */
interface ThemeContextType {
  /** Current theme preference */
  themePreference: 'light' | 'dark' | 'system';
  /** Current effective theme (resolved from system if preference is 'system') */
  effectiveTheme: 'light' | 'dark';
  /** Session colors configuration */
  sessionColors: Record<string, string>;
  /** Current custom theme (if any) */
  customTheme?: Theme;
  /** All available themes */
  availableThemes: Theme[];
  /** Apply a theme by ID */
  applyTheme: (themeId: string) => boolean;
  /** Create a new custom theme */
  createCustomTheme: (name: string, description: string, baseTheme: Theme) => Theme;
}

/**
 * Props for ThemeProvider component
 */
interface ThemeProviderProps {
  /** Child components to wrap with theme context */
  children: React.ReactNode;
}

// === CONTEXT ===

/**
 * Theme context for sharing theme state across components
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Hook to access theme context
 * 
 * @returns Theme context value
 * @throws Error if used outside ThemeProvider
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// === THEME PROVIDER COMPONENT ===

/**
 * ThemeProvider component that manages global theme state and application
 * 
 * Wraps the entire application and provides theme context. Automatically
 * applies theme changes to the document root and handles system theme
 * preference detection. Integrates with ThemeManager for advanced theming.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { themePreference, sessionColors, customTheme, updateSettings } = useThemeSettings();
  
  // Calculate effective theme (resolve 'system' to actual theme)
  const [effectiveTheme, setEffectiveTheme] = React.useState<'light' | 'dark'>('light');
  const [currentCustomTheme, setCurrentCustomTheme] = React.useState<Theme | undefined>();
  const [availableThemes, setAvailableThemes] = React.useState<Theme[]>([]);
  const [lastAppliedTheme, setLastAppliedTheme] = React.useState<string | null>(null);

  // Load available themes
  useEffect(() => {
    setAvailableThemes(themeManager.getAllThemes());
  }, []);

  /**
   * Apply theme using theme manager or fallback to basic theme
   */
  const applyThemeInternal = React.useCallback(() => {
    const root = document.documentElement;
    let targetThemeId: string;
    
    // Determine target theme ID
    if (customTheme) {
      targetThemeId = customTheme;
    } else if (themePreference === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      targetThemeId = systemDark ? 'dark' : 'light';
    } else {
      targetThemeId = themePreference;
    }
    
    // Skip if same theme is already applied
    if (lastAppliedTheme === targetThemeId) {
      return;
    }
    
    // If custom theme is set, use theme manager
    if (customTheme) {
      const success = themeManager.applyTheme(customTheme);
      if (success) {
        const theme = themeManager.getTheme(customTheme);
        setCurrentCustomTheme(theme || undefined);
        setEffectiveTheme(theme?.type === 'dark' ? 'dark' : 'light');
        setLastAppliedTheme(customTheme);
        return;
      }
    }

    // Fallback to basic theme preference
    if (themePreference === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const resolvedTheme = systemDark ? 'dark' : 'light';
      themeManager.applyTheme(resolvedTheme);
      root.setAttribute('data-theme', resolvedTheme);
      setEffectiveTheme(resolvedTheme);
      setLastAppliedTheme(resolvedTheme);
    } else {
      themeManager.applyTheme(themePreference);
      root.setAttribute('data-theme', themePreference);
      setEffectiveTheme(themePreference);
      setLastAppliedTheme(themePreference);
    }
    
    setCurrentCustomTheme(undefined);
  }, [themePreference, customTheme, lastAppliedTheme]);

  // Apply theme when preference changes
  useEffect(() => {
    applyThemeInternal();
  }, [applyThemeInternal]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (themePreference === 'system' && !customTheme) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleSystemThemeChange = () => {
        applyThemeInternal();
      };
      
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      };
    }
  }, [themePreference, customTheme, applyThemeInternal]);

  /**
   * Apply theme by ID and save to settings
   */
  const applyTheme = React.useCallback((themeId: string): boolean => {
    // Skip if same theme is already applied
    if (lastAppliedTheme === themeId) {
      return true;
    }
    
    const success = themeManager.applyTheme(themeId);
    if (success) {
      updateSettings({ customTheme: themeId });
      const theme = themeManager.getTheme(themeId);
      setCurrentCustomTheme(theme || undefined);
      setEffectiveTheme(theme?.type === 'dark' ? 'dark' : 'light');
      setLastAppliedTheme(themeId);
    }
    return success;
  }, [updateSettings, lastAppliedTheme]);

  /**
   * Create a new custom theme
   */
  const createCustomTheme = React.useCallback((
    name: string, 
    description: string, 
    baseTheme: Theme
  ): Theme => {
    const newTheme = themeManager.createCustomTheme(name, description, baseTheme);
    setAvailableThemes(themeManager.getAllThemes());
    return newTheme;
  }, []);

  // Create context value
  const contextValue: ThemeContextType = {
    themePreference,
    effectiveTheme,
    sessionColors: sessionColors || {},
    customTheme: currentCustomTheme,
    availableThemes,
    applyTheme,
    createCustomTheme
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
} 