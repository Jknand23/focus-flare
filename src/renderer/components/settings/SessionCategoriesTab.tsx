/**
 * SessionCategoriesTab - Custom session category management
 * 
 * Allows users to customize existing session categories by renaming them,
 * changing colors, and adding custom icons. Provides a way to personalize
 * the session classification system while maintaining the underlying
 * AI classification structure.
 * 
 * @module SessionCategoriesTab
 * @author FocusFlare Team
 * @since 0.3.0
 */

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@/renderer/stores/settings-store';
import type { SessionType } from '@/shared/types/activity-types';

// === TYPES ===

/**
 * Custom session category configuration
 */
interface CustomCategory {
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
 * Default category configurations
 */
const DEFAULT_CATEGORIES: Record<SessionType, CustomCategory> = {
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
 * Available icons for categories
 */
const AVAILABLE_ICONS = [
  '🎯', '🔍', '🎮', '☕', '❓', '💼', '📚', '🎨', '🔧', '📊',
  '💻', '📝', '🎵', '📹', '🌐', '📧', '📞', '💬', '🎪', '🏃',
  '🧘', '🍽️', '🛒', '🏠', '🚗', '✈️', '📱', '⚙️', '🎓', '🏆'
];

// === MAIN COMPONENT ===

/**
 * Session categories management component
 */
export function SessionCategoriesTab() {
  const { settings, updateSettings } = useSettingsStore();
  const [categories, setCategories] = useState<Record<SessionType, CustomCategory>>(DEFAULT_CATEGORIES);
  const [editingCategory, setEditingCategory] = useState<SessionType | null>(null);
  const [showIconPicker, setShowIconPicker] = useState<SessionType | null>(null);

  // Load custom categories from settings
  useEffect(() => {
    // For now, we'll use the session colors from settings to update the default colors
    if (settings.sessionColors) {
      const updatedCategories = { ...DEFAULT_CATEGORIES };
      Object.entries(settings.sessionColors).forEach(([type, color]) => {
        if (updatedCategories[type as SessionType]) {
          updatedCategories[type as SessionType].color = color as string;
        }
      });
      setCategories(updatedCategories);
    }
  }, [settings.sessionColors]);

  /**
   * Handle category update
   */
  function handleCategoryUpdate(type: SessionType, updates: Partial<CustomCategory>) {
    const updatedCategories = {
      ...categories,
      [type]: {
        ...categories[type],
        ...updates
      }
    };
    setCategories(updatedCategories);

    // Update session colors in settings
    const updatedSessionColors = Object.fromEntries(
      Object.entries(updatedCategories).map(([type, category]) => [type, category.color])
    ) as Record<SessionType, string>;
    updateSettings({ sessionColors: updatedSessionColors });
  }

  /**
   * Reset category to default
   */
  function handleResetCategory(type: SessionType) {
    handleCategoryUpdate(type, DEFAULT_CATEGORIES[type]);
  }

  /**
   * Reset all categories to defaults
   */
  function handleResetAll() {
    setCategories(DEFAULT_CATEGORIES);
    const defaultColors = Object.fromEntries(
      Object.entries(DEFAULT_CATEGORIES).map(([type, category]) => [type, category.color])
    ) as Record<SessionType, string>;
    updateSettings({ sessionColors: defaultColors });
  }

  /**
   * Handle icon selection
   */
  function handleIconSelect(type: SessionType, icon: string) {
    handleCategoryUpdate(type, { icon });
    setShowIconPicker(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Session Categories
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Customize how your session types are displayed. The AI will still classify activities into these categories, 
          but you can personalize their names, colors, and icons.
        </p>
      </div>

      {/* Categories List */}
      <div className="space-y-4">
        {Object.entries(categories).map(([type, category]) => (
          <div
            key={type}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                {/* Icon */}
                <div className="relative">
                                     <button
                     onClick={() => setShowIconPicker(showIconPicker === type ? null : type as SessionType)}
                     className="text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
                     title="Change icon"
                   >
                    {category.icon}
                  </button>
                  
                  {/* Icon Picker Dropdown */}
                  {showIconPicker === type && (
                    <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg z-10">
                      <div className="grid grid-cols-6 gap-2 w-48">
                        {AVAILABLE_ICONS.map((icon) => (
                          <button
                            key={icon}
                            onClick={() => handleIconSelect(type as SessionType, icon)}
                            className="text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors"
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Category Info */}
                <div className="flex-1">
                  {editingCategory === type ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={category.displayName}
                        onChange={(e) => handleCategoryUpdate(type as SessionType, { displayName: e.target.value })}
                        className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 font-medium"
                        placeholder="Category name"
                      />
                      <input
                        type="text"
                        value={category.description}
                        onChange={(e) => handleCategoryUpdate(type as SessionType, { description: e.target.value })}
                        className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
                        placeholder="Category description"
                      />
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {category.displayName}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {category.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Color Picker */}
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={category.color}
                    onChange={(e) => handleCategoryUpdate(type as SessionType, { color: e.target.value })}
                    className="w-10 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                    title="Change color"
                  />
                  <input
                    type="text"
                    value={category.color}
                    onChange={(e) => handleCategoryUpdate(type as SessionType, { color: e.target.value })}
                    className="w-20 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {editingCategory === type ? (
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      Done
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingCategory(type as SessionType)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleResetCategory(type as SessionType)}
                    className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                    title="Reset to default"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Timeline Preview: {category.icon} {category.displayName}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Changes are automatically saved and will appear in your timeline and analytics.
        </div>
        
        <button
          onClick={handleResetAll}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Reset All to Defaults
        </button>
      </div>

      {/* Usage Note */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-600 dark:text-blue-400 text-lg">💡</div>
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              How Session Categories Work
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              These categories are used by the AI to classify your activities. Customizing the display names 
              and colors doesn&apos;t affect the AI&apos;s ability to recognize and categorize your work patterns. 
              The underlying classification system remains the same, ensuring consistent analytics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 