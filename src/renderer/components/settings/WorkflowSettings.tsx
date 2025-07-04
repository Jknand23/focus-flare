/**
 * Workflow Settings Component
 * 
 * Provides configuration interface for N8N workflow automation within
 * the FocusFlare settings panel. Allows users to enable/disable workflows,
 * configure automation templates, and manage workflow backups and imports.
 * 
 * @component
 * @since Phase 3
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  AlertCircle, 
  Settings, 
  Play, 
  Pause, 
  Download,
  Upload,
  RefreshCw,
  FileText,
  FolderOpen,
  Workflow,
  Database,
  Shield
} from 'lucide-react';
import { BackupRestoreTab } from './BackupRestoreTab';

// === SIMPLE UI COMPONENTS ===

interface AlertProps {
  children: React.ReactNode;
  className?: string;
}

function Alert({ children, className = '' }: AlertProps) {
  return (
    <div className={`p-4 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
      {children}
    </div>
  );
}

interface AlertDescriptionProps {
  children: React.ReactNode;
}

function AlertDescription({ children }: AlertDescriptionProps) {
  return <div className="text-blue-700 flex items-center gap-2">{children}</div>;
}

interface TabsProps {
  defaultValue: string;
  className?: string;
  children: React.ReactNode;
}

// Simple tabs implementation using React context for state sharing
const TabsContext = React.createContext<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
} | null>(null);

function Tabs({ defaultValue, className = '', children }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={`w-full ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

function TabsList({ className = '', children }: TabsListProps) {
  return (
    <div className={`flex bg-gray-100 p-1 rounded-lg ${className}`}>
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

function TabsTrigger({ value, className = '', children }: TabsTriggerProps) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');
  
  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;
  
  return (
    <button
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive 
          ? 'bg-white text-gray-900 shadow-sm' 
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      } ${className}`}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

function TabsContent({ value, className = '', children }: TabsContentProps) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');
  
  const { activeTab } = context;
  if (activeTab !== value) return null;
  
  return (
    <div className={`mt-4 ${className}`}>
      {children}
    </div>
  );
}

// === TYPES ===

interface WorkflowStatus {
  isRunning: boolean;
  port: number;
  processId?: number;
}

// === COMPONENT ===

function WorkflowSettings() {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({
    isRunning: false,
    port: 5678
  });

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    loadWorkflowStatus();
  }, []);

  const loadWorkflowStatus = async () => {
    try {
      if (window.electronAPI) {
        const status = await window.electronAPI.invoke('workflow:get-status');
        setWorkflowStatus(status);
      }
    } catch (error) {
      console.error('Failed to load workflow status:', error);
    }
  };

  const toggleN8N = async () => {
    try {
      setIsLoading(true);
      
      if (workflowStatus.isRunning) {
        await window.electronAPI.invoke('workflow:stop-n8n');
        setStatusMessage('N8N stopped');
      } else {
        await window.electronAPI.invoke('workflow:start-n8n');
        setStatusMessage('N8N started');
      }
      
      await loadWorkflowStatus();
      
    } catch (error) {
      console.error('Failed to toggle N8N:', error);
      setStatusMessage('Failed to control N8N');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Workflow className="w-5 h-5" />
        <h2 className="text-xl font-semibold">Workflow Automation</h2>
      </div>

      {statusMessage && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="control" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="control" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Control
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <Workflow className="w-4 h-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Backup & Restore
          </TabsTrigger>
        </TabsList>

        <TabsContent value="control" className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              N8N Instance Status
            </h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${workflowStatus.isRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">
                    {workflowStatus.isRunning ? 'Running' : 'Stopped'}
                  </span>
                  <Badge variant={workflowStatus.isRunning ? "default" : "secondary"}>
                    {workflowStatus.isRunning ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Port: {workflowStatus.port}
                  {workflowStatus.processId && ` | PID: ${workflowStatus.processId}`}
                </div>
              </div>
              
              <Button
                onClick={toggleN8N}
                disabled={isLoading}
                variant={workflowStatus.isRunning ? "destructive" : "default"}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : workflowStatus.isRunning ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isLoading ? 'Loading...' : workflowStatus.isRunning ? 'Stop N8N' : 'Start N8N'}
              </Button>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Quick Actions
            </h3>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Status
              </Button>
              
              <Button variant="outline" size="sm">
                <FolderOpen className="w-4 h-4 mr-2" />
                Open N8N Dashboard
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Workflow className="w-4 h-4" />
              Available Workflows
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Smart File Organization</h4>
                  <p className="text-sm text-gray-600">Automatically organize files based on session activity</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">Template</Badge>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Enabled</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Daily Focus Summary</h4>
                  <p className="text-sm text-gray-600">Generate daily productivity reports</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">Template</Badge>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Enabled</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Meeting Preparation</h4>
                  <p className="text-sm text-gray-600">Automated pre-meeting focus sessions</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">Template</Badge>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Enabled</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Workflow Templates
            </h3>
            
            <div className="space-y-3">
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Import Template
                </Button>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Export Templates
                </Button>
              </div>
              
              <div className="text-sm text-gray-600">
                Manage workflow templates for quick setup and sharing
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="backup">
          <BackupRestoreTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default WorkflowSettings; 
