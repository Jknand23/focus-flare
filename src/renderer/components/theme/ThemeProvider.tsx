/**
 * ThemeProvider - Global theme management for the application
 * 
 * Provides theme context and manages theme application at the document level.
 * Handles light, dark, and system theme preferences and applies them to the
 * entire application via CSS data attributes on the document root.
 * 
 * @module ThemeProvider
 * @author FocusFlare Team
 * @since 0.2.0
 */

import React, { useEffect, createContext, useContext } from 'react';
import { useThemeSettings } from '@/renderer/stores/settings-store';

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
 * preference detection.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { themePreference, sessionColors } = useThemeSettings();
  
  // Calculate effective theme (resolve 'system' to actual theme)
  const [effectiveTheme, setEffectiveTheme] = React.useState<'light' | 'dark'>('light');

  /**
   * Apply theme to document root and update effective theme
   */
  const applyTheme = React.useCallback(() => {
    const root = document.documentElement;
    
    if (themePreference === 'system') {
      // Check system preference
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const resolvedTheme = systemDark ? 'dark' : 'light';
      root.setAttribute('data-theme', resolvedTheme);
      setEffectiveTheme(resolvedTheme);
    } else {
      root.setAttribute('data-theme', themePreference);
      setEffectiveTheme(themePreference);
    }
  }, [themePreference]);

  // Apply theme when preference changes
  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (themePreference === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleSystemThemeChange = () => {
        applyTheme();
      };
      
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      };
    }
  }, [themePreference, applyTheme]);

  // Create context value
  const contextValue: ThemeContextType = {
    themePreference,
    effectiveTheme,
    sessionColors: sessionColors || {}
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
} 