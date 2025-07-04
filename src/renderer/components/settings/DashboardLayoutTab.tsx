/**
 * DashboardLayoutTab - Customizable dashboard layout management
 * 
 * Allows users to customize the dashboard layout by showing/hiding widgets,
 * rearranging components, and personalizing the information displayed.
 * Provides a visual interface for layout management with real-time preview.
 * 
 * @module DashboardLayoutTab
 * @author FocusFlare Team
 * @since 0.3.0
 */

import React, { useState } from 'react';

// === TYPES ===

/**
 * Dashboard widget configuration
 */
interface DashboardWidget {
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
 * Dashboard layout configuration
 */
interface DashboardLayout {
  /** Layout style */
  style: 'compact' | 'comfortable' | 'spacious';
  /** Number of columns */
  columns: 1 | 2 | 3;
  /** Whether to show section headers */
  showSectionHeaders: boolean;
  /** Whether to show widget borders */
  showWidgetBorders: boolean;
  /** Enabled widgets */
  widgets: DashboardWidget[];
}

// === DEFAULT WIDGETS ===

/**
 * Default dashboard widget configurations
 */
const DEFAULT_WIDGETS: DashboardWidget[] = [
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
];

/**
 * Default dashboard layout
 */
const DEFAULT_LAYOUT: DashboardLayout = {
  style: 'comfortable',
  columns: 2,
  showSectionHeaders: true,
  showWidgetBorders: false,
  widgets: DEFAULT_WIDGETS
};

// === MAIN COMPONENT ===

/**
 * Dashboard layout customization component
 */
export function DashboardLayoutTab() {
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);

  /**
   * Handle widget toggle
   */
  function handleWidgetToggle(widgetId: string) {
    const updatedWidgets = layout.widgets.map(widget =>
      widget.id === widgetId
        ? { ...widget, enabled: !widget.enabled }
        : widget
    );

    setLayout({ ...layout, widgets: updatedWidgets });
  }

  /**
   * Handle widget size change
   */
  function handleWidgetSizeChange(widgetId: string, size: DashboardWidget['size']) {
    const updatedWidgets = layout.widgets.map(widget =>
      widget.id === widgetId
        ? { ...widget, size }
        : widget
    );

    setLayout({ ...layout, widgets: updatedWidgets });
  }

  /**
   * Handle layout style change
   */
  function handleLayoutChange(updates: Partial<DashboardLayout>) {
    setLayout({ ...layout, ...updates });
  }

  /**
   * Save layout configuration
   */
  function handleSaveLayout() {
    console.log('Saving layout configuration:', layout);
  }

  /**
   * Reset to default layout
   */
  function handleResetLayout() {
    setLayout(DEFAULT_LAYOUT);
  }

  /**
   * Get widgets by category
   */
  function getWidgetsByCategory(category: DashboardWidget['category']) {
    return layout.widgets
      .filter(widget => widget.category === category)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Get size class for widget
   */
  function getSizeClass(size: DashboardWidget['size']) {
    switch (size) {
      case 'small': return 'col-span-1';
      case 'medium': return 'col-span-1 md:col-span-1';
      case 'large': return 'col-span-1 md:col-span-2';
      case 'full': return 'col-span-full';
      default: return 'col-span-1';
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Dashboard Layout
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Customize your dashboard by enabling widgets, changing their sizes, and arranging them to fit your workflow.
        </p>
      </div>

      {/* Layout Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Layout Style</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Layout Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Spacing Style
            </label>
            <select
              value={layout.style}
              onChange={(e) => handleLayoutChange({ style: e.target.value as DashboardLayout['style'] })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </select>
          </div>

          {/* Columns */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Columns
            </label>
            <select
              value={layout.columns}
              onChange={(e) => handleLayoutChange({ columns: parseInt(e.target.value) as DashboardLayout['columns'] })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            >
              <option value={1}>1 Column</option>
              <option value={2}>2 Columns</option>
              <option value={3}>3 Columns</option>
            </select>
          </div>

          {/* Layout Options */}
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={layout.showSectionHeaders}
                onChange={(e) => handleLayoutChange({ showSectionHeaders: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show section headers</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={layout.showWidgetBorders}
                onChange={(e) => handleLayoutChange({ showWidgetBorders: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show widget borders</span>
            </label>
          </div>
        </div>
      </div>

      {/* Widget Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Available Widgets</h4>
        
        {/* Widget Categories */}
        {(['overview', 'timeline', 'analytics', 'insights'] as const).map(category => (
          <div key={category} className="mb-6">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 capitalize">
              {category} Widgets
            </h5>
            
            <div className="space-y-3">
              {getWidgetsByCategory(category).map(widget => (
                <div
                  key={widget.id}
                  className={`p-3 border rounded-lg transition-all ${
                    widget.enabled
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={widget.enabled}
                          onChange={() => handleWidgetToggle(widget.id)}
                          className="rounded"
                        />
                        <div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {widget.name}
                          </span>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {widget.description}
                          </p>
                        </div>
                      </label>
                    </div>

                    {widget.enabled && (
                      <div className="flex items-center space-x-3">
                        <select
                          value={widget.size}
                          onChange={(e) => handleWidgetSizeChange(widget.id, e.target.value as DashboardWidget['size'])}
                          className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                          <option value="full">Full Width</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Layout Preview</h4>
        
        <div 
          className={`grid gap-4 ${
            layout.columns === 1 ? 'grid-cols-1' : 
            layout.columns === 2 ? 'grid-cols-1 md:grid-cols-2' : 
            'grid-cols-1 md:grid-cols-3'
          }`}
        >
          {layout.widgets
            .filter(widget => widget.enabled)
            .sort((a, b) => a.order - b.order)
            .map(widget => (
              <div
                key={widget.id}
                className={`${getSizeClass(widget.size)} p-3 rounded-lg ${
                  layout.showWidgetBorders 
                    ? 'border border-gray-200 dark:border-gray-700' 
                    : 'bg-gray-100 dark:bg-gray-700'
                } ${
                  layout.style === 'compact' ? 'p-2' :
                  layout.style === 'spacious' ? 'p-6' : 'p-3'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {widget.name}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-600 px-1 rounded">
                    {widget.size}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Enabled widgets: {layout.widgets.filter(w => w.enabled).length} of {layout.widgets.length}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleResetLayout}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Reset to Default
          </button>
          <button
            onClick={handleSaveLayout}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Save Layout
          </button>
        </div>
      </div>
    </div>
  );
} 