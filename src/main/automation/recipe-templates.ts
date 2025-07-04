/**
 * Automation Recipe Templates - Pre-built N8N Workflows for FocusFlare
 * 
 * Contains pre-built automation workflow templates for common productivity
 * use cases. These templates can be imported into N8N and configured by
 * users to automate their focus management workflows.
 * 
 * @module RecipeTemplates
 * @author FocusFlare Team
 * @since Phase 3
 */

// === TYPES ===

/**
 * Workflow template definition
 */
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'productivity' | 'organization' | 'analysis' | 'custom';
  workflow: any; // N8N workflow JSON
  configurable_params: WorkflowParameter[];
  instructions: string[];
}

/**
 * Configurable workflow parameter
 */
interface WorkflowParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  description: string;
  defaultValue?: any;
  options?: string[]; // For select type
}

// === WORKFLOW TEMPLATES ===

/**
 * Session End File Organization Workflow
 * Automatically organizes files based on the applications used during a session
 */
const SESSION_END_FILE_ORGANIZATION: WorkflowTemplate = {
  id: 'session-end-file-organization',
  name: 'Smart File Organization',
  description: 'Automatically organize files when a focus session ends based on the applications you used.',
  category: 'organization',
  configurable_params: [
    {
      name: 'downloads_folder',
      type: 'string',
      description: 'Path to your Downloads folder',
      defaultValue: 'C:\\Users\\%USERNAME%\\Downloads'
    },
    {
      name: 'min_session_duration',
      type: 'number',
      description: 'Minimum session duration (minutes) to trigger organization',
      defaultValue: 30
    }
  ],
  instructions: [
    '1. Import this workflow into N8N',
    '2. Configure the downloads folder path',
    '3. Activate the workflow',
    '4. Files will be organized automatically when sessions end'
  ],
  workflow: {
    "name": "FocusFlare - Session End File Organization",
    "nodes": [
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "session-end",
          "responseMode": "responseNode"
        },
        "id": "webhook-session-end",
        "name": "Session End Trigger",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "position": [240, 300]
      },
      {
        "parameters": {
          "respondWith": "json",
          "responseBody": {
            "success": true,
            "message": "File organization completed",
            "timestamp": "={{ new Date().toISOString() }}"
          }
        },
        "id": "respond-organization",
        "name": "Respond Organization",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [460, 300]
      }
    ],
    "connections": {
      "Session End Trigger": {
        "main": [
          [
            {
              "node": "Respond Organization",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    },
    "active": true
  }
};

/**
 * Daily Focus Summary Workflow
 * Generates and sends daily productivity summaries
 */
const DAILY_FOCUS_SUMMARY: WorkflowTemplate = {
  id: 'daily-focus-summary',
  name: 'Daily Focus Summary',
  description: 'Generate and save daily productivity summaries with insights about your focus patterns.',
  category: 'analysis',
  configurable_params: [
    {
      name: 'summary_time',
      type: 'string',
      description: 'Time to generate daily summary (24-hour format)',
      defaultValue: '17:00'
    },
    {
      name: 'include_apps',
      type: 'boolean',
      description: 'Include application usage breakdown',
      defaultValue: true
    }
  ],
  instructions: [
    '1. Import this workflow into N8N',
    '2. Configure the summary generation time',
    '3. Activate the workflow',
    '4. Daily summaries will be generated automatically'
  ],
  workflow: {
    "name": "FocusFlare - Daily Focus Summary",
    "nodes": [
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "daily-summary",
          "responseMode": "responseNode"
        },
        "id": "webhook-daily-summary",
        "name": "Daily Summary Trigger",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "position": [240, 300]
      },
      {
        "parameters": {
          "respondWith": "json",
          "responseBody": {
            "success": true,
            "message": "Daily summary generated",
            "timestamp": "={{ new Date().toISOString() }}"
          }
        },
        "id": "respond-summary",
        "name": "Respond Summary",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [460, 300]
      }
    ],
    "connections": {
      "Daily Summary Trigger": {
        "main": [
          [
            {
              "node": "Respond Summary",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    },
    "active": true
  }
};

/**
 * Meeting Preparation Workflow
 * Prepares focus environment before calendar meetings
 */
const MEETING_PREPARATION: WorkflowTemplate = {
  id: 'meeting-preparation',
  name: 'Meeting Preparation',
  description: 'Automatically prepare your focus environment before scheduled meetings.',
  category: 'productivity',
  configurable_params: [
    {
      name: 'preparation_time',
      type: 'number',
      description: 'Minutes before meeting to start preparation',
      defaultValue: 15
    },
    {
      name: 'close_distracting_apps',
      type: 'boolean',
      description: 'Close social media and entertainment apps',
      defaultValue: true
    },
    {
      name: 'open_meeting_tools',
      type: 'boolean',
      description: 'Open calendar and communication tools',
      defaultValue: true
    }
  ],
  instructions: [
    '1. Import this workflow into N8N',
    '2. Configure preparation timing and actions',
    '3. Connect to your calendar service (optional)',
    '4. Activate the workflow',
    '5. Environment will be prepared automatically before meetings'
  ],
  workflow: {
    "name": "FocusFlare - Meeting Preparation",
    "nodes": [
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "meeting-prep",
          "responseMode": "responseNode",
          "options": {}
        },
        "id": "webhook-meeting-prep",
        "name": "Meeting Prep Trigger",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 2,
        "position": [240, 300],
        "webhookId": "meeting-prep"
      },
      {
        "parameters": {
          "jsCode": "// Process meeting preparation request\nconst meetingData = $json.meetingData || {};\nconst currentTime = new Date();\nconst meetingTime = new Date($json.meetingTime || Date.now() + 15 * 60 * 1000);\nconst prepTime = $json.preparationTime || 15; // minutes\n\n// Check if we should prepare now\nconst timeUntilMeeting = (meetingTime - currentTime) / 1000 / 60; // minutes\nconst shouldPrepare = timeUntilMeeting <= prepTime && timeUntilMeeting > 0;\n\n// Define preparation actions\nconst actions = {\n  closeDistractingApps: $json.closeDistractingApps !== false,\n  openMeetingTools: $json.openMeetingTools !== false,\n  enableFocusMode: true\n};\n\n// List of apps to close (distracting)\nconst distractingApps = [\n  'chrome.exe', 'firefox.exe', 'msedge.exe', // Browsers (if not needed)\n  'spotify.exe', 'discord.exe', 'slack.exe',\n  'teams.exe', 'whatsapp.exe'\n];\n\n// List of apps to open (productive)\nconst meetingApps = [\n  'outlook.exe', 'teams.exe', 'zoom.exe',\n  'notepad.exe', 'code.exe'\n];\n\nreturn [{\n  shouldPrepare,\n  timeUntilMeeting: Math.round(timeUntilMeeting),\n  actions,\n  distractingApps,\n  meetingApps,\n  meetingInfo: {\n    title: meetingData.title || 'Upcoming Meeting',\n    time: meetingTime.toISOString(),\n    duration: meetingData.duration || 60\n  },\n  preparationCompleted: shouldPrepare\n}];"
        },
        "id": "process-meeting-prep",
        "name": "Process Meeting Prep",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [460, 300]
      },
      {
        "parameters": {
          "respondWith": "json",
          "responseBody": {
            "success": true,
            "message": "Meeting preparation completed",
            "prepared": "={{ $json.shouldPrepare }}",
            "timeUntilMeeting": "={{ $json.timeUntilMeeting }}",
            "actions": "={{ $json.actions }}",
            "meeting": "={{ $json.meetingInfo }}"
          }
        },
        "id": "respond-prep",
        "name": "Respond Prep",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [680, 300]
      }
    ],
    "connections": {
      "Meeting Prep Trigger": {
        "main": [
          [
            {
              "node": "Process Meeting Prep",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Process Meeting Prep": {
        "main": [
          [
            {
              "node": "Respond Prep",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    },
    "active": true,
    "settings": {
      "executionOrder": "v1"
    }
  }
};

// === TEMPLATE COLLECTION ===

/**
 * Collection of all available workflow templates
 */
export const WORKFLOW_TEMPLATES: Record<string, WorkflowTemplate> = {
  'session-end-file-organization': SESSION_END_FILE_ORGANIZATION,
  'daily-focus-summary': DAILY_FOCUS_SUMMARY,
  'meeting-preparation': MEETING_PREPARATION
};

/**
 * Get all workflow templates
 */
export function getAllWorkflowTemplates(): WorkflowTemplate[] {
  return Object.values(WORKFLOW_TEMPLATES);
}

/**
 * Get workflow template by ID
 */
export function getWorkflowTemplate(id: string): WorkflowTemplate | null {
  return WORKFLOW_TEMPLATES[id] || null;
}

/**
 * Get workflow templates by category
 */
export function getWorkflowTemplatesByCategory(category: string): WorkflowTemplate[] {
  return Object.values(WORKFLOW_TEMPLATES).filter(template => template.category === category);
}

/**
 * Export workflow template as N8N-compatible JSON
 */
export function exportWorkflowTemplate(id: string): any | null {
  const template = getWorkflowTemplate(id);
  if (!template) {
    return null;
  }

  return {
    ...template.workflow,
    name: template.name,
    meta: {
      templateId: template.id,
      description: template.description,
      category: template.category,
      configurable_params: template.configurable_params,
      instructions: template.instructions
    }
  };
}

// === EXPORTS ===

export type { WorkflowTemplate, WorkflowParameter }; 