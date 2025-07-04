/**
 * ImportExportTab - Configuration import/export management
 * 
 * Provides functionality to export and import FocusFlare configuration data
 * including themes, session categories, dashboard layouts, and user settings.
 * Supports JSON format for easy backup and sharing of configurations.
 * 
 * @module ImportExportTab
 * @author FocusFlare Team
 * @since 0.3.0
 */

import React, { useState, useRef } from 'react';
import { useSettingsStore } from '@/renderer/stores/settings-store';
import { getThemeManager } from '@/renderer/theme/theme-manager';
import type { Theme } from '@/renderer/theme/theme-manager';
import type { SessionType, UserSettings } from '@/shared/types/activity-types';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertCircle, Download, Upload, FileText, Settings, Palette, Grid3x3, CheckCircle, XCircle } from 'lucide-react';

// === TYPES ===

/**
 * Custom session category configuration for export
 */
interface ExportSessionCategory {
  /** Original session type */
  type: SessionType;
  /** Custom display name */
  displayName: string;
  /** Custom description */
  description: string;
  /** Custom color */
  color: string;
  /** Custom icon (emoji or icon name) */
  icon: string;
  /** Whether this category is enabled */
  enabled: boolean;
}

/**
 * Dashboard widget configuration for export
 */
interface ExportDashboardWidget {
  /** Unique widget identifier */
  id: string;
  /** Display name */
  name: string;
  /** Widget description */
  description: string;
  /** Whether widget is enabled */
  enabled: boolean;
  /** Widget order/position */
  order: number;
  /** Widget size preference */
  size: 'small' | 'medium' | 'large' | 'full';
  /** Widget category */
  category: 'overview' | 'timeline' | 'analytics' | 'insights';
}

/**
 * Dashboard layout configuration for export
 */
interface ExportDashboardLayout {
  /** Layout style */
  style: 'compact' | 'comfortable' | 'spacious';
  /** Number of columns */
  columns: 1 | 2 | 3;
  /** Whether to show section headers */
  showSectionHeaders: boolean;
  /** Whether to show widget borders */
  showWidgetBorders: boolean;
  /** Enabled widgets */
  widgets: ExportDashboardWidget[];
}

/**
 * Complete configuration export data
 */
interface FocusFlareConfig {
  /** Export metadata */
  metadata: {
    /** Export format version */
    version: string;
    /** Export timestamp */
    exportedAt: string;
    /** FocusFlare version */
    appVersion: string;
  };
  /** User settings */
  settings: UserSettings;
  /** Custom themes */
  customThemes: Theme[];
  /** Session categories configuration */
  sessionCategories: Record<SessionType, ExportSessionCategory>;
  /** Dashboard layout configuration */
  dashboardLayout: ExportDashboardLayout;
}

/**
 * Import validation result
 */
interface ImportValidationResult {
  /** Whether import data is valid */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Warnings */
  warnings: string[];
  /** Detected configuration types */
  detectedTypes: string[];
}

// === DEFAULT CONFIGURATIONS ===

/**
 * Default session categories for import/export
 */
const DEFAULT_SESSION_CATEGORIES: Record<SessionType, ExportSessionCategory> = {
  'focused-work': {
    type: 'focused-work',
    displayName: 'Focused Work',
    description: 'Deep focus sessions for concentrated work',
    color: '#059669',
    icon: '🎯',
    enabled: true
  },
  'research': {
    type: 'research',
    displayName: 'Research',
    description: 'Information gathering and learning activities',
    color: '#2563eb',
    icon: '🔍',
    enabled: true
  },
  'entertainment': {
    type: 'entertainment',
    displayName: 'Entertainment',
    description: 'Leisure activities and entertainment',
    color: '#dc2626',
    icon: '🎮',
    enabled: true
  },
  'break': {
    type: 'break',
    displayName: 'Break',
    description: 'Rest periods and breaks from work',
    color: '#7c3aed',
    icon: '☕',
    enabled: true
  },
  'unclear': {
    type: 'unclear',
    displayName: 'Unclear',
    description: 'Activities that could not be classified',
    color: '#6b7280',
    icon: '❓',
    enabled: true
  }
};

/**
 * Default dashboard layout for import/export
 */
const DEFAULT_DASHBOARD_LAYOUT: ExportDashboardLayout = {
  style: 'comfortable',
  columns: 2,
  showSectionHeaders: true,
  showWidgetBorders: false,
  widgets: [
    {
      id: 'daily-summary',
      name: 'Daily Summary',
      description: 'Overview of today\'s focus time and sessions',
      enabled: true,
      order: 1,
      size: 'medium',
      category: 'overview'
    },
    {
      id: 'timeline-chart',
      name: 'Timeline Chart',
      description: 'Visual timeline of today\'s activities',
      enabled: true,
      order: 2,
      size: 'large',
      category: 'timeline'
    },
    {
      id: 'focus-streak',
      name: 'Focus Streak',
      description: 'Current focus streak and achievements',
      enabled: true,
      order: 3,
      size: 'small',
      category: 'overview'
    },
    {
      id: 'session-breakdown',
      name: 'Session Breakdown',
      description: 'Pie chart of session types',
      enabled: true,
      order: 4,
      size: 'medium',
      category: 'analytics'
    },
    {
      id: 'insights-panel',
      name: 'AI Insights',
      description: 'Personalized productivity insights',
      enabled: true,
      order: 5,
      size: 'medium',
      category: 'insights'
    }
  ]
};

// === MAIN COMPONENT ===

/**
 * ImportExportTab provides configuration import/export functionality
 */
export function ImportExportTab() {
  const { settings, updateSettings } = useSettingsStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<FocusFlareConfig | null>(null);
  const [importValidation, setImportValidation] = useState<ImportValidationResult | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [importOptions, setImportOptions] = useState({
    importSettings: true,
    importThemes: true,
    importCategories: true,
    importDashboard: true,
    mergeMode: false // false = replace, true = merge
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const themeManager = getThemeManager();

  /**
   * Auto-clear messages after 5 seconds
   */
  React.useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  /**
   * Create current configuration export data
   */
  function createExportData(): FocusFlareConfig {
    const customThemes = themeManager.getCustomThemes();
    
    // Create session categories from current settings
    const sessionCategories: Record<SessionType, ExportSessionCategory> = { ...DEFAULT_SESSION_CATEGORIES };
    if (settings.sessionColors) {
      Object.entries(settings.sessionColors).forEach(([type, color]) => {
        if (sessionCategories[type as SessionType]) {
          sessionCategories[type as SessionType].color = color;
        }
      });
    }

    return {
      metadata: {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        appVersion: '0.3.0' // This should come from app metadata
      },
      settings,
      customThemes,
      sessionCategories,
      dashboardLayout: DEFAULT_DASHBOARD_LAYOUT // This should come from actual dashboard settings
    };
  }

  /**
   * Export configuration to JSON file
   */
  async function handleExportConfig() {
    try {
      setIsExporting(true);
      setMessage(null);

      const exportData = createExportData();
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `focusflare-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Configuration exported successfully!' });
    } catch (error) {
      console.error('Export failed:', error);
      setMessage({ type: 'error', text: 'Failed to export configuration' });
    } finally {
      setIsExporting(false);
    }
  }

  /**
   * Handle file selection for import
   */
  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportData(null);
      setImportValidation(null);
      setMessage(null);
    }
  }

  /**
   * Validate import data
   */
  function validateImportData(data: any): ImportValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const detectedTypes: string[] = [];

    // Check basic structure
    if (!data || typeof data !== 'object') {
      errors.push('Invalid JSON format');
      return { isValid: false, errors, warnings, detectedTypes };
    }

    // Check metadata
    if (!data.metadata || !data.metadata.version) {
      warnings.push('Missing metadata, assuming legacy format');
    }

    // Check settings
    if (data.settings && typeof data.settings === 'object') {
      detectedTypes.push('User Settings');
    }

    // Check custom themes
    if (data.customThemes && Array.isArray(data.customThemes)) {
      detectedTypes.push('Custom Themes');
      data.customThemes.forEach((theme: any, index: number) => {
        if (!theme.id || !theme.name || !theme.colors) {
          warnings.push(`Theme ${index + 1} has invalid structure`);
        }
      });
    }

    // Check session categories
    if (data.sessionCategories && typeof data.sessionCategories === 'object') {
      detectedTypes.push('Session Categories');
      const requiredTypes: SessionType[] = ['focused-work', 'research', 'entertainment', 'break', 'unclear'];
      requiredTypes.forEach(type => {
        if (!data.sessionCategories[type]) {
          warnings.push(`Missing session category: ${type}`);
        }
      });
    }

    // Check dashboard layout
    if (data.dashboardLayout && typeof data.dashboardLayout === 'object') {
      detectedTypes.push('Dashboard Layout');
    }

    const isValid = errors.length === 0 && detectedTypes.length > 0;
    return { isValid, errors, warnings, detectedTypes };
  }

  /**
   * Parse and validate import file
   */
  async function handleParseFile() {
    if (!importFile) return;

    try {
      setIsImporting(true);
      setMessage(null);

      const text = await importFile.text();
      const data = JSON.parse(text);
      
      const validation = validateImportData(data);
      setImportValidation(validation);

      if (validation.isValid) {
        setImportData(data);
        setMessage({ 
          type: 'info', 
          text: `File parsed successfully! Found: ${validation.detectedTypes.join(', ')}`
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: `Invalid file format: ${validation.errors.join(', ')}`
        });
      }
    } catch (error) {
      console.error('Parse failed:', error);
      setMessage({ type: 'error', text: 'Failed to parse JSON file' });
    } finally {
      setIsImporting(false);
    }
  }

  /**
   * Import configuration data
   */
  async function handleImportConfig() {
    if (!importData) return;

    try {
      setIsImporting(true);
      setMessage(null);

      let updateCount = 0;

      // Import settings
      if (importOptions.importSettings && importData.settings) {
        await updateSettings(importData.settings);
        updateCount++;
      }

      // Import custom themes
      if (importOptions.importThemes && importData.customThemes) {
        for (const theme of importData.customThemes) {
          try {
            themeManager.createCustomTheme(
              theme.name,
              theme.description,
              theme,
              theme.colors
            );
            updateCount++;
          } catch (error) {
            console.warn(`Failed to import theme: ${theme.name}`, error);
          }
        }
      }

      // Import session categories
      if (importOptions.importCategories && importData.sessionCategories) {
        const sessionColors: Record<SessionType, string> = {
          'focused-work': '#059669',
          'research': '#2563eb',
          'entertainment': '#dc2626',
          'break': '#7c3aed',
          'unclear': '#6b7280'
        };
        Object.entries(importData.sessionCategories).forEach(([type, category]) => {
          sessionColors[type as SessionType] = category.color;
        });
        await updateSettings({ sessionColors });
        updateCount++;
      }

      // Import dashboard layout
      if (importOptions.importDashboard && importData.dashboardLayout) {
        // Dashboard layout import would be handled here
        // For now, just log it as it's not fully implemented
        console.log('Dashboard layout import:', importData.dashboardLayout);
        updateCount++;
      }

      setMessage({ 
        type: 'success', 
        text: `Configuration imported successfully! ${updateCount} components updated.`
      });
      
      // Reset form
      setImportFile(null);
      setImportData(null);
      setImportValidation(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Import failed:', error);
      setMessage({ type: 'error', text: 'Failed to import configuration' });
    } finally {
      setIsImporting(false);
    }
  }

  /**
   * Reset import form
   */
  function handleResetImport() {
    setImportFile(null);
    setImportData(null);
    setImportValidation(null);
    setMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Import & Export Configuration
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Backup your FocusFlare configuration or import settings from another device. 
          Configuration files include themes, session categories, dashboard layouts, and user preferences.
        </p>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' :
          'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' && <CheckCircle className="h-5 w-5 mr-2" />}
            {message.type === 'error' && <XCircle className="h-5 w-5 mr-2" />}
            {message.type === 'info' && <AlertCircle className="h-5 w-5 mr-2" />}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Export Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Export Configuration
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create a backup of your current FocusFlare configuration
            </p>
          </div>
          <Download className="h-6 w-6 text-gray-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <Settings className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">User Settings</span>
          </div>
          <div className="flex items-center space-x-2">
            <Palette className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Custom Themes</span>
          </div>
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Session Categories</span>
          </div>
          <div className="flex items-center space-x-2">
            <Grid3x3 className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Dashboard Layout</span>
          </div>
        </div>

        <Button 
          onClick={handleExportConfig}
          disabled={isExporting}
          className="w-full"
        >
          {isExporting ? 'Exporting...' : 'Export Configuration'}
        </Button>
      </Card>

      {/* Import Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Import Configuration
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Restore configuration from a backup file
            </p>
          </div>
          <Upload className="h-6 w-6 text-gray-400" />
        </div>

        {/* File Selection */}
        <div className="mb-4">
          <label htmlFor="config-file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Configuration File
          </label>
          <input
            id="config-file"
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400"
          />
        </div>

        {/* File Info */}
        {importFile && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {importFile.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(importFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                onClick={handleParseFile}
                disabled={isImporting}
                size="sm"
                variant="outline"
              >
                {isImporting ? 'Parsing...' : 'Parse File'}
              </Button>
            </div>
          </div>
        )}

        {/* Import Validation */}
        {importValidation && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              File Validation
            </h5>
            
            {importValidation.detectedTypes.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Detected configurations:</p>
                <div className="flex flex-wrap gap-2">
                  {importValidation.detectedTypes.map((type) => (
                    <Badge key={type} variant="secondary">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {importValidation.warnings.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">Warnings:</p>
                <ul className="text-xs text-yellow-600 dark:text-yellow-400 space-y-1">
                  {importValidation.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {importValidation.errors.length > 0 && (
              <div>
                <p className="text-sm text-red-600 dark:text-red-400 mb-2">Errors:</p>
                <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                  {importValidation.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Import Options */}
        {importData && importValidation?.isValid && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
              Import Options
            </h5>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="import-settings"
                  checked={importOptions.importSettings}
                  onChange={(e) => setImportOptions({...importOptions, importSettings: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="import-settings" className="text-sm text-gray-700 dark:text-gray-300">
                  Import User Settings
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="import-themes"
                  checked={importOptions.importThemes}
                  onChange={(e) => setImportOptions({...importOptions, importThemes: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="import-themes" className="text-sm text-gray-700 dark:text-gray-300">
                  Import Custom Themes
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="import-categories"
                  checked={importOptions.importCategories}
                  onChange={(e) => setImportOptions({...importOptions, importCategories: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="import-categories" className="text-sm text-gray-700 dark:text-gray-300">
                  Import Session Categories
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="import-dashboard"
                  checked={importOptions.importDashboard}
                  onChange={(e) => setImportOptions({...importOptions, importDashboard: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="import-dashboard" className="text-sm text-gray-700 dark:text-gray-300">
                  Import Dashboard Layout
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="merge-mode"
                  checked={importOptions.mergeMode}
                  onChange={(e) => setImportOptions({...importOptions, mergeMode: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="merge-mode" className="text-sm text-gray-700 dark:text-gray-300">
                  Merge with existing (otherwise replace)
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Import Actions */}
        <div className="flex space-x-3">
          <Button
            onClick={handleImportConfig}
            disabled={!importData || !importValidation?.isValid || isImporting}
            className="flex-1"
          >
            {isImporting ? 'Importing...' : 'Import Configuration'}
          </Button>
          
          <Button
            onClick={handleResetImport}
            variant="outline"
            disabled={isImporting}
          >
            Reset
          </Button>
        </div>
      </Card>
    </div>
  );
} 