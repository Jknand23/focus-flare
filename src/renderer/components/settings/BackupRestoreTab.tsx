/**
 * Backup and Restore Tab Component
 * 
 * Provides user interface for N8N workflow backup and restore operations.
 * Includes functionality for creating backups, restoring from backups,
 * managing backup locations, and handling custom file paths.
 * 
 * @module BackupRestoreTab
 * @author FocusFlare Team
 * @since Phase 3
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { BackupMetadata } from '@/shared/types/workflow-types';

// === TYPES ===

interface BackupRestoreTabProps {
  className?: string;
}

// === UTILITY FUNCTIONS ===

/**
 * Formats file size in human-readable format
 * 
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "1.2 MB")
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats date in user-friendly format
 * 
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

// === MAIN COMPONENT ===

/**
 * BackupRestoreTab provides UI for workflow backup and restore operations.
 * 
 * Features:
 * - Create new backups with custom names and locations
 * - List existing backups with metadata
 * - Restore from selected backups
 * - Delete unwanted backups
 * - Manage custom backup locations
 * - Simple file path inputs for import/export
 * 
 * @param props - Component props
 * @returns JSX element for the backup/restore tab
 */
export function BackupRestoreTab({ className }: BackupRestoreTabProps): JSX.Element {
  // === STATE ===
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Backup creation state
  const [backupName, setBackupName] = useState('');
  const [customBackupLocation, setCustomBackupLocation] = useState('');
  
  // Restore state
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [restoreLocation, setRestoreLocation] = useState('');
  
  // === EFFECTS ===
  
  /**
   * Load available backups on component mount
   */
  useEffect(() => {
    loadBackups();
  }, []); // Empty dependency array - only run on mount

  /**
   * Auto-clear messages after 5 seconds
   */
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // === HANDLERS ===

  /**
   * Loads the list of available backups
   */
  async function loadBackups(): Promise<void> {
    try {
      setIsLoading(true);
      setError(null);
      
      const backupList = await window.electronAPI.workflowBackup.list({
        location: customBackupLocation || undefined
      });
      
      setBackups(backupList);
    } catch (err) {
      setError(`Failed to load backups: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Creates a new backup with the specified options
   */
  async function handleCreateBackup(): Promise<void> {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      const result = await window.electronAPI.workflowBackup.create({
        name: backupName.trim() || undefined,
        location: customBackupLocation.trim() || undefined
      });
      
      setSuccess(`Backup created successfully: ${result.name} (${result.workflowCount} workflows)`);
      setBackupName('');
      
      // Refresh backup list
      await loadBackups();
    } catch (err) {
      setError(`Failed to create backup: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Restores workflows from the selected backup
   */
  async function handleRestoreBackup(): Promise<void> {
    if (!selectedBackupId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      const result = await window.electronAPI.workflowBackup.restore({
        backupId: selectedBackupId,
        location: restoreLocation.trim() || undefined
      });
      
      setSuccess(`Restored ${result.length} workflows successfully`);
      setSelectedBackupId(null);
    } catch (err) {
      setError(`Failed to restore backup: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Deletes the specified backup
   */
  async function handleDeleteBackup(backupId: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      await window.electronAPI.workflowBackup.delete({
        backupId,
        location: customBackupLocation.trim() || undefined
      });
      
      setSuccess('Backup deleted successfully');
      
      // Refresh backup list
      await loadBackups();
    } catch (err) {
      setError(`Failed to delete backup: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Opens file dialog to select a custom backup location
   */
  async function handleSelectBackupLocation(): Promise<void> {
    try {
      const result = await window.electronAPI.dialog.selectDirectory({
        title: 'Select Backup Location',
        defaultPath: customBackupLocation
      });
      
      if (result && !result.canceled && result.filePaths.length > 0) {
        setCustomBackupLocation(result.filePaths[0]);
      }
    } catch (err) {
      setError(`Failed to select backup location: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Opens file dialog to select a restore location
   */
  async function handleSelectRestoreLocation(): Promise<void> {
    try {
      const result = await window.electronAPI.dialog.selectDirectory({
        title: 'Select Restore Location',
        defaultPath: restoreLocation
      });
      
      if (result && !result.canceled && result.filePaths.length > 0) {
        setRestoreLocation(result.filePaths[0]);
      }
    } catch (err) {
      setError(`Failed to select restore location: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // === RENDER ===

  return (
    <div className={`p-6 space-y-6 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflow Backup & Restore</h2>
          <p className="text-gray-600 mt-1">
            Create backups of your N8N workflows and restore them when needed
          </p>
        </div>
        <Button
          onClick={loadBackups}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-700">
          <strong>Success:</strong> {success}
        </div>
      )}

      {/* Create Backup Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Create New Backup</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backup Name (Optional)
            </label>
            <input
              type="text"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              placeholder="Enter backup name or leave empty for auto-generated"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Backup Location (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customBackupLocation}
                onChange={(e) => setCustomBackupLocation(e.target.value)}
                placeholder="Enter custom path or leave empty for default"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                onClick={handleSelectBackupLocation}
                disabled={isLoading}
                variant="outline"
              >
                Browse
              </Button>
            </div>
          </div>

          <Button
            onClick={handleCreateBackup}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Creating Backup...' : 'Create Backup'}
          </Button>
        </div>
      </Card>

      {/* Backup List Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Available Backups</h3>
        
        {backups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No backups found.</p>
            <p className="text-sm mt-2">Create your first backup to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className={`border rounded-lg p-4 transition-colors ${
                  selectedBackupId === backup.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{backup.name}</h4>
                      <Badge variant="secondary">
                        {backup.workflowCount} workflows
                      </Badge>
                      <Badge variant="outline">
                        {formatFileSize(backup.size)}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Created: {formatDate(backup.timestamp)}</p>
                      <p>Location: {backup.location}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setSelectedBackupId(
                        selectedBackupId === backup.id ? null : backup.id
                      )}
                      variant={selectedBackupId === backup.id ? "default" : "outline"}
                      size="sm"
                    >
                      {selectedBackupId === backup.id ? 'Selected' : 'Select'}
                    </Button>
                    
                    <Button
                      onClick={() => handleDeleteBackup(backup.id)}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Restore Section */}
      {selectedBackupId && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Restore from Backup</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Restore Location (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={restoreLocation}
                  onChange={(e) => setRestoreLocation(e.target.value)}
                  placeholder="Enter custom path or leave empty for default"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  onClick={handleSelectRestoreLocation}
                  disabled={isLoading}
                  variant="outline"
                >
                  Browse
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleRestoreBackup}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Restoring...' : 'Restore Workflows'}
              </Button>
              
              <Button
                onClick={() => setSelectedBackupId(null)}
                disabled={isLoading}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
} 