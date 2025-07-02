/**
 * SessionModal - Session detail modal with label correction interface
 * 
 * Displays detailed information about a selected session and provides an
 * interface for users to correct AI classifications and provide feedback.
 * Supports dropdown selection for session types, reflection prompts,
 * and real-time label updates. Core component for AI learning system.
 * 
 * @module SessionModal
 * @author FocusFlare Team
 * @since 0.2.0
 */

import React, { useState, useCallback } from 'react';
import type { SessionData, SessionType, UpdateSessionRequest } from '@/shared/types/activity-types';

// === COMPONENT TYPES ===

/**
 * Props interface for SessionModal component
 */
interface SessionModalProps {
  /** Session data to display */
  session: SessionData | null;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when session is updated */
  onSessionUpdate: (sessionId: number, updates: UpdateSessionRequest) => Promise<void>;
  /** Loading state for update operations */
  isUpdating?: boolean;
}

// === CONSTANTS ===

/** Available session types for correction */
const SESSION_TYPE_OPTIONS: { value: SessionType; label: string; description: string }[] = [
  {
    value: 'focused-work',
    label: 'Focused Work',
    description: 'Concentrated work on documents, code, or professional tasks'
  },
  {
    value: 'research',
    label: 'Research',
    description: 'Reading, browsing for information, learning activities'
  },
  {
    value: 'entertainment',
    label: 'Entertainment',
    description: 'Games, videos, social media, leisure activities'
  },
  {
    value: 'break',
    label: 'Break',
    description: 'Short breaks, personal tasks, away from computer'
  },
  {
    value: 'unclear',
    label: 'Unclear',
    description: 'Insufficient data to determine activity type'
  }
];

/** Reflection prompt suggestions */
const REFLECTION_PROMPTS = [
  "What was the main goal of this session?",
  "How focused did you feel during this time?",
  "What helped or hindered your productivity?",
  "Would you categorize this differently? Why?",
  "Any context that might help improve classification?"
];

// === UTILITY FUNCTIONS ===

/**
 * Formats duration for display
 * 
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return '< 1m';
  }
}

/**
 * Gets confidence level description
 * 
 * @param confidence - Confidence score (0-1)
 * @returns Confidence level description
 */
function getConfidenceLevel(confidence: number): string {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.6) return 'Medium';
  if (confidence >= 0.4) return 'Low';
  return 'Very Low';
}

// === MAIN COMPONENT ===

/**
 * SessionModal component for session details and label correction
 */
export function SessionModal({
  session,
  isOpen,
  onClose,
  onSessionUpdate,
  isUpdating = false
}: SessionModalProps) {
  const [selectedType, setSelectedType] = useState<SessionType | null>(null);
  const [userFeedback, setUserFeedback] = useState('');
  const [showReflectionPrompts, setShowReflectionPrompts] = useState(false);

  // Initialize form when session changes
  React.useEffect(() => {
    if (session) {
      setSelectedType(session.sessionType);
      // Only populate user feedback if it doesn't look like an AI/system message
      const feedback = session.userFeedback || '';
      const isSystemMessage = feedback.startsWith('Rule-based classification') || 
                              feedback.includes('AI classification failed') ||
                              feedback === 'Not classified';
      setUserFeedback(isSystemMessage ? '' : feedback);
    }
  }, [session]);

  // Handle modal close
  const handleClose = useCallback(() => {
    setSelectedType(null);
    setUserFeedback('');
    setShowReflectionPrompts(false);
    onClose();
  }, [onClose]);

  // Handle session update
  const handleUpdateSession = useCallback(async () => {
    if (!session || !selectedType) return;

    try {
      const updates: UpdateSessionRequest = {
        sessionId: session.id,
        sessionType: selectedType,
        userFeedback: userFeedback.trim() || undefined,
        userCorrected: selectedType !== session.sessionType
      };

      await onSessionUpdate(session.id, updates);
      handleClose();
    } catch (error) {
      console.error('Failed to update session:', error);
      // Show error notification to user
      alert('Failed to update session. Please try again.');
    }
  }, [session, selectedType, userFeedback, onSessionUpdate, handleClose]);

  // Handle reflection prompt selection
  const handlePromptSelect = useCallback((prompt: string) => {
    setUserFeedback(prev => {
      const currentText = prev.trim();
      if (currentText) {
        return `${currentText}\n\n${prompt}`;
      } else {
        return prompt;
      }
    });
    setShowReflectionPrompts(false);
  }, []);

  if (!isOpen || !session) {
    return null;
  }

  const hasChanges = selectedType !== session.sessionType || 
                    userFeedback.trim() !== (session.userFeedback || '').trim();
  const canSave = selectedType && hasChanges;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Session Details
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Basic Session Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Duration</div>
              <div className="text-lg text-gray-900">{formatDuration(session.duration)}</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Time Range</div>
              <div className="text-lg text-gray-900">
                {session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {' '}
                {session.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* AI Confidence */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">AI Confidence</div>
            <div className="flex items-center space-x-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${session.confidenceScore * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">
                {Math.round(session.confidenceScore * 100)}% ({getConfidenceLevel(session.confidenceScore)})
              </span>
            </div>
          </div>

          {/* Session Type Correction */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">Session Type</div>
              {session.userCorrected && (
                <span className="text-xs text-blue-600 font-medium">Previously corrected</span>
              )}
            </div>
            
            <div className="space-y-2">
              {SESSION_TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex items-start p-3 rounded-lg border cursor-pointer transition-all
                    ${selectedType === option.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="sessionType"
                    value={option.value}
                    checked={selectedType === option.value}
                    onChange={(e) => setSelectedType(e.target.value as SessionType)}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Feedback Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">
                Additional Context (Optional)
              </div>
              <button
                onClick={() => setShowReflectionPrompts(!showReflectionPrompts)}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                {showReflectionPrompts ? 'Hide' : 'Show'} reflection prompts
              </button>
            </div>

            {/* Reflection Prompts */}
            {showReflectionPrompts && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="text-xs text-gray-600 mb-2">
                  Click a prompt to add it to your feedback:
                </div>
                {REFLECTION_PROMPTS.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handlePromptSelect(prompt)}
                    className="block w-full text-left text-sm text-gray-700 hover:text-gray-900 py-1 px-2 rounded hover:bg-gray-100 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <textarea
              value={userFeedback}
              onChange={(e) => setUserFeedback(e.target.value)}
              placeholder="Share any context that might help improve future classifications..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
            />
            
            <div className="text-xs text-gray-500">
              This feedback helps improve AI classification accuracy for future sessions.
            </div>
          </div>

          {/* Activity List */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">
              Activities ({session.activities.length})
            </div>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {session.activities.map((activity, index) => (
                <div key={activity.id || index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {activity.appName}
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {activity.windowTitle}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 ml-2">
                    {activity.formattedDuration}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {hasChanges ? 'You have unsaved changes' : 'No changes made'}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateSession}
              disabled={!canSave || isUpdating}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${canSave && !isUpdating
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 