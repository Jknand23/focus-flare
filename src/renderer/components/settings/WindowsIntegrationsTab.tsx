/**
 * WindowsIntegrationsTab - Windows App Integration Settings
 * 
 * Provides user interface for configuring Windows pre-installed app integrations
 * including Calendar and File Explorer. Allows users to enable/disable
 * integrations, configure data sources, and manage privacy settings.
 * 
 * Features:
 * - Calendar integration configuration
 * - File Explorer monitoring settings
 * - Privacy and security controls
 * - Integration status display
 * - Data retention management
 * 
 * @component
 * @author FocusFlare Team
 * @since Phase 4
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card';
import { Button } from '@/renderer/components/ui/button';
import { Badge } from '@/renderer/components/ui/badge';
import { 
  Calendar, 
  FolderOpen, 
  Shield, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  Files,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw
} from 'lucide-react';
import type {
  WindowsIntegrationsConfig,
  IntegrationStatus
} from '@/shared/types/windows-integration-types';

// === TYPES ===

interface WindowsIntegrationsTabProps {
  /** Current integration configuration */
  config: WindowsIntegrationsConfig;
  /** Configuration update handler */
  onConfigUpdate: (config: WindowsIntegrationsConfig) => void;
  /** Integration status information */
  integrationStatus: {
    calendar: IntegrationStatus;
    fileExplorer: IntegrationStatus;
  };
}

interface IntegrationCardProps {
  /** Integration name */
  name: string;
  /** Integration description */
  description: string;
  /** Integration icon */
  icon: React.ReactNode;
  /** Integration status */
  status: IntegrationStatus;
  /** Whether integration is enabled */
  enabled: boolean;
  /** Enable/disable handler */
  onToggle: (enabled: boolean) => void;
  /** Configuration handler */
  onConfigure: () => void;
  /** Test connection handler */
  onTest: () => void;
}

// === MAIN COMPONENT ===

/**
 * Windows Integrations Settings Tab
 * 
 * Provides configuration interface for Windows app integrations including
 * Calendar and File Explorer monitoring with privacy controls.
 */
export function WindowsIntegrationsTab({
  config,
  onConfigUpdate,
  integrationStatus
}: WindowsIntegrationsTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [_testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // === INTEGRATION HANDLERS ===

  /**
   * Handle calendar integration toggle
   */
  const handleCalendarToggle = (enabled: boolean) => {
    const newConfig = {
      ...config,
      calendar: {
        ...config.calendar,
        enabled
      }
    };
    onConfigUpdate(newConfig);
  };

  /**
   * Handle file explorer integration toggle
   */
  const handleFileExplorerToggle = (enabled: boolean) => {
    const newConfig = {
      ...config,
      fileExplorer: {
        ...config.fileExplorer,
        enabled
      }
    };
    onConfigUpdate(newConfig);
  };

  /**
   * Handle global integration toggle
   */
  const handleGlobalToggle = (enabled: boolean) => {
    const newConfig = {
      ...config,
      global: {
        ...config.global,
        enabled
      }
    };
    onConfigUpdate(newConfig);
  };

  /**
   * Test calendar integration
   */
  const testCalendarIntegration = async () => {
    setIsLoading(true);
    try {
      // Test calendar access
      const success = await window.electronAPI.system.testCalendarAccess();
      setTestResults(prev => ({ ...prev, calendar: success }));
    } catch (error) {
      console.error('Calendar test failed:', error);
      setTestResults(prev => ({ ...prev, calendar: false }));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Test file explorer integration
   */
  const testFileExplorerIntegration = async () => {
    setIsLoading(true);
    try {
      // Test file monitoring access
      const success = await window.electronAPI.system.testFileMonitoring();
      setTestResults(prev => ({ ...prev, fileExplorer: success }));
    } catch (error) {
      console.error('File explorer test failed:', error);
      setTestResults(prev => ({ ...prev, fileExplorer: false }));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear integration data
   */
  const clearIntegrationData = async () => {
    if (confirm('Are you sure you want to clear all Windows integration data? This action cannot be undone.')) {
      try {
        await window.electronAPI.system.clearIntegrationData();
        alert('Integration data cleared successfully');
      } catch (error) {
        console.error('Failed to clear integration data:', error);
        alert('Failed to clear integration data');
      }
    }
  };

  // === RENDER ===

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Windows Integrations</h2>
          <p className="text-muted-foreground">
            Connect with Windows pre-installed apps to enhance productivity insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </Button>
        </div>
      </div>

      {/* Global Integration Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Global Integration Settings
          </CardTitle>
          <CardDescription>
            Master control for all Windows app integrations. Data is processed locally only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Enable Windows Integrations</p>
              <p className="text-sm text-muted-foreground">
                Allow FocusFlare to access Windows app data for productivity insights
              </p>
            </div>
            <Button
              variant={config.global.enabled ? "default" : "outline"}
              onClick={() => handleGlobalToggle(!config.global.enabled)}
            >
              {config.global.enabled ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Enabled
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Disabled
                </>
              )}
            </Button>
          </div>

          {showAdvanced && (
            <div className="mt-4 space-y-4 border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Data Retention (Days)
                  </label>
                  <input
                    type="number"
                    value={config.global.dataRetentionDays}
                    onChange={(e) => onConfigUpdate({
                      ...config,
                      global: {
                        ...config.global,
                        dataRetentionDays: parseInt(e.target.value, 10)
                      }
                    })}
                    className="w-full px-3 py-2 border rounded-md"
                    min="1"
                    max="365"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Sync Interval (Minutes)
                  </label>
                  <input
                    type="number"
                    value={config.global.syncIntervalMinutes}
                    onChange={(e) => onConfigUpdate({
                      ...config,
                      global: {
                        ...config.global,
                        syncIntervalMinutes: parseInt(e.target.value, 10)
                      }
                    })}
                    className="w-full px-3 py-2 border rounded-md"
                    min="5"
                    max="1440"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="privacyMode"
                  checked={config.global.privacyMode}
                  onChange={(e) => onConfigUpdate({
                    ...config,
                    global: {
                      ...config.global,
                      privacyMode: e.target.checked
                    }
                  })}
                  className="w-4 h-4"
                />
                <label htmlFor="privacyMode" className="text-sm font-medium">
                  Enhanced Privacy Mode
                </label>
                <p className="text-sm text-muted-foreground">
                  Anonymize sensitive data in meeting titles and file paths
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar Integration */}
      <IntegrationCard
        name="Windows Calendar"
        description="Access calendar events for meeting context and productivity insights"
        icon={<Calendar className="h-5 w-5" />}
        status={integrationStatus.calendar}
        enabled={config.calendar.enabled}
        onToggle={handleCalendarToggle}
        onConfigure={() => {/* Open calendar config modal */}}
        onTest={testCalendarIntegration}
      />

      {/* File Explorer Integration */}
      <IntegrationCard
        name="File Explorer"
        description="Monitor file access patterns to understand work activity"
        icon={<FolderOpen className="h-5 w-5" />}
        status={integrationStatus.fileExplorer}
        enabled={config.fileExplorer.enabled}
        onToggle={handleFileExplorerToggle}
        onConfigure={() => {/* Open file explorer config modal */}}
        onTest={testFileExplorerIntegration}
      />

      {/* Calendar Configuration */}
      {config.calendar.enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar Configuration
            </CardTitle>
            <CardDescription>
              Configure which calendar events to include in productivity analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Look-ahead Days
                </label>
                <input
                  type="number"
                  value={config.calendar.lookAheadDays}
                  onChange={(e) => onConfigUpdate({
                    ...config,
                    calendar: {
                      ...config.calendar,
                      lookAheadDays: parseInt(e.target.value, 10)
                    }
                  })}
                  className="w-full px-3 py-2 border rounded-md"
                  min="1"
                  max="30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Look-behind Days
                </label>
                <input
                  type="number"
                  value={config.calendar.lookBehindDays}
                  onChange={(e) => onConfigUpdate({
                    ...config,
                    calendar: {
                      ...config.calendar,
                      lookBehindDays: parseInt(e.target.value, 10)
                    }
                  })}
                  className="w-full px-3 py-2 border rounded-md"
                  min="1"
                  max="7"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeAllDayEvents"
                checked={config.calendar.includeAllDayEvents}
                onChange={(e) => onConfigUpdate({
                  ...config,
                  calendar: {
                    ...config.calendar,
                    includeAllDayEvents: e.target.checked
                  }
                })}
                className="w-4 h-4"
              />
              <label htmlFor="includeAllDayEvents" className="text-sm font-medium">
                Include All-Day Events
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Minimum Event Duration (Minutes)
              </label>
              <input
                type="number"
                value={config.calendar.minEventDuration}
                onChange={(e) => onConfigUpdate({
                  ...config,
                  calendar: {
                    ...config.calendar,
                    minEventDuration: parseInt(e.target.value, 10)
                  }
                })}
                className="w-full px-3 py-2 border rounded-md"
                min="0"
                max="480"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Explorer Configuration */}
      {config.fileExplorer.enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              File Explorer Configuration
            </CardTitle>
            <CardDescription>
              Configure which file activities to monitor and analyze
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="trackFileOpens"
                  checked={config.fileExplorer.trackFileOpens}
                  onChange={(e) => onConfigUpdate({
                    ...config,
                    fileExplorer: {
                      ...config.fileExplorer,
                      trackFileOpens: e.target.checked
                    }
                  })}
                  className="w-4 h-4"
                />
                <label htmlFor="trackFileOpens" className="text-sm font-medium">
                  Track File Opens
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="trackFileModifications"
                  checked={config.fileExplorer.trackFileModifications}
                  onChange={(e) => onConfigUpdate({
                    ...config,
                    fileExplorer: {
                      ...config.fileExplorer,
                      trackFileModifications: e.target.checked
                    }
                  })}
                  className="w-4 h-4"
                />
                <label htmlFor="trackFileModifications" className="text-sm font-medium">
                  Track Modifications
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="trackFileCreations"
                  checked={config.fileExplorer.trackFileCreations}
                  onChange={(e) => onConfigUpdate({
                    ...config,
                    fileExplorer: {
                      ...config.fileExplorer,
                      trackFileCreations: e.target.checked
                    }
                  })}
                  className="w-4 h-4"
                />
                <label htmlFor="trackFileCreations" className="text-sm font-medium">
                  Track Creations
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Min File Size (Bytes)
                </label>
                <input
                  type="number"
                  value={config.fileExplorer.minFileSize}
                  onChange={(e) => onConfigUpdate({
                    ...config,
                    fileExplorer: {
                      ...config.fileExplorer,
                      minFileSize: parseInt(e.target.value, 10)
                    }
                  })}
                  className="w-full px-3 py-2 border rounded-md"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Max File Size (MB)
                </label>
                <input
                  type="number"
                  value={Math.round(config.fileExplorer.maxFileSize / (1024 * 1024))}
                  onChange={(e) => onConfigUpdate({
                    ...config,
                    fileExplorer: {
                      ...config.fileExplorer,
                      maxFileSize: parseInt(e.target.value, 10) * 1024 * 1024
                    }
                  })}
                  className="w-full px-3 py-2 border rounded-md"
                  min="1"
                  max="1000"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Manage integration data and privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Clear Integration Data</p>
              <p className="text-sm text-muted-foreground">
                Remove all stored Windows integration data from local database
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={clearIntegrationData}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Clear Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// === INTEGRATION CARD COMPONENT ===

/**
 * Integration Card Component
 * 
 * Displays status and controls for an individual Windows integration
 */
function IntegrationCard({
  name,
  description,
  icon,
  status,
  enabled,
  onToggle,
  onConfigure,
  onTest
}: IntegrationCardProps) {
  const getStatusBadge = () => {
    if (!status.available) {
      return <Badge variant="destructive">Unavailable</Badge>;
    }
    if (!enabled) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    if (status.error) {
      return <Badge variant="destructive">Error</Badge>;
    }
    if (status.enabled) {
      return <Badge variant="default">Active</Badge>;
    }
    return <Badge variant="outline">Ready</Badge>;
  };

  const getStatusIcon = () => {
    if (!status.available) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    if (status.error) {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (status.enabled) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            {name}
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusBadge()}
          </div>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {status.lastSync && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last sync: {new Date(status.lastSync).toLocaleString()}
              </div>
            )}
            {status.itemCount !== undefined && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Files className="h-3 w-3" />
                {status.itemCount} items
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onTest}
              disabled={!status.available}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Test
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onConfigure}
              disabled={!enabled}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
            <Button
              variant={enabled ? "default" : "outline"}
              size="sm"
              onClick={() => onToggle(!enabled)}
              disabled={!status.available}
            >
              {enabled ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Disable
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Enable
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// === EXPORTS ===

// Function is already exported above
export type { WindowsIntegrationsTabProps }; 
