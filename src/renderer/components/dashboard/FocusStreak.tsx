/**
 * FocusStreak - Focus streak tracking and visualization component
 * 
 * Displays current focus streak, longest streak achieved, and visual calendar
 * showing streak progress over time. Includes achievement celebrations and
 * motivational elements to encourage consistent focus habits. Part of Phase 3
 * enhancement features for gamification and habit tracking.
 * 
 * @module FocusStreak
 * @author FocusFlare Team
 * @since 0.3.0
 */

import { useMemo } from 'react';
import type { FocusStreak as FocusStreakType, MultiDayTimelineData } from '@/shared/types/activity-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/renderer/components/ui/card';
import { Badge } from '@/renderer/components/ui/badge';
import { Progress } from '@/renderer/components/ui/progress';
import { 
  Flame, 
  Target, 
  Award, 
  Clock,
  CheckCircle,
  Circle,
  Zap
} from 'lucide-react';

// === COMPONENT TYPES ===

/**
 * Props interface for FocusStreak component
 */
interface FocusStreakProps {
  /** Focus streak data */
  streak: FocusStreakType;
  /** Multi-day timeline data for calendar view */
  multiDayData: MultiDayTimelineData[];
  /** Whether to show detailed calendar view */
  showCalendar?: boolean;
  /** Custom focus goal override */
  customGoal?: number;
}

// === CONSTANTS ===

/** Streak milestone achievements */
const STREAK_MILESTONES = [
  { days: 3, name: 'Getting Started', icon: '🌱', color: 'bg-green-100 text-green-800' },
  { days: 7, name: 'Week Warrior', icon: '🏃‍♂️', color: 'bg-blue-100 text-blue-800' },
  { days: 14, name: 'Two Week Titan', icon: '💪', color: 'bg-purple-100 text-purple-800' },
  { days: 21, name: 'Habit Master', icon: '🧠', color: 'bg-orange-100 text-orange-800' },
  { days: 30, name: 'Month Champion', icon: '🏆', color: 'bg-gold-100 text-gold-800' },
  { days: 60, name: 'Focus Legend', icon: '👑', color: 'bg-red-100 text-red-800' },
  { days: 100, name: 'Centurion', icon: '⭐', color: 'bg-yellow-100 text-yellow-800' }
];

/** Day names for calendar */
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// === HELPER FUNCTIONS ===

/**
 * Gets the current milestone for a streak
 */
function getCurrentMilestone(streakDays: number) {
  const achieved = STREAK_MILESTONES.filter(m => streakDays >= m.days);
  return achieved.length > 0 ? achieved[achieved.length - 1] : null;
}

/**
 * Gets the next milestone to achieve
 */
function getNextMilestone(streakDays: number) {
  return STREAK_MILESTONES.find(m => streakDays < m.days) || null;
}

/**
 * Formats duration in minutes to readable format
 */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Gets streak calendar data for the last 30 days
 */
function getStreakCalendarData(multiDayData: MultiDayTimelineData[]): Array<{
  date: Date;
  metGoal: boolean;
  isToday: boolean;
  dayOfWeek: number;
}> {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 29);
  
  const calendar: Array<{
    date: Date;
    metGoal: boolean;
    isToday: boolean;
    dayOfWeek: number;
  }> = [];
  
  // Create calendar for last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(thirtyDaysAgo);
    date.setDate(thirtyDaysAgo.getDate() + i);
    
    const dayData = multiDayData.find(d => 
      d.date.toDateString() === date.toDateString()
    );
    
    calendar.push({
      date: new Date(date),
      metGoal: dayData?.metFocusGoal || false,
      isToday: date.toDateString() === today.toDateString(),
      dayOfWeek: date.getDay()
    });
  }
  
  return calendar;
}

// === STREAK CALENDAR COMPONENT ===

/**
 * Calendar component showing streak progress
 */
interface StreakCalendarProps {
  multiDayData: MultiDayTimelineData[];
}

function StreakCalendar({ multiDayData }: StreakCalendarProps) {
  const calendarData = getStreakCalendarData(multiDayData);
  
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm text-gray-700">Last 30 Days</h4>
      
      <div className="space-y-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {DAY_NAMES.map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 p-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarData.map((day, index) => (
            <div
              key={index}
              className={`
                aspect-square p-1 rounded-lg border-2 flex items-center justify-center
                ${day.metGoal 
                  ? 'bg-green-100 border-green-300' 
                  : 'bg-gray-50 border-gray-200'
                }
                ${day.isToday ? 'ring-2 ring-blue-500' : ''}
              `}
            >
              {day.metGoal ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <Circle className="h-3 w-3 text-gray-400" />
              )}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <span>Goal met</span>
          </div>
          <div className="flex items-center gap-1">
            <Circle className="h-3 w-3 text-gray-400" />
            <span>Goal missed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border-2 border-blue-500" />
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// === ACHIEVEMENT COMPONENT ===

/**
 * Achievement display component
 */
interface AchievementProps {
  currentStreak: number;
  longestStreak: number;
}

function Achievement({ currentStreak, longestStreak }: AchievementProps) {
  const currentMilestone = getCurrentMilestone(currentStreak);
  const nextMilestone = getNextMilestone(currentStreak);
  const longestMilestone = getCurrentMilestone(longestStreak);
  
  return (
    <div className="space-y-4">
      {/* Current achievement */}
      {currentMilestone && (
        <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
          <div className="text-2xl mb-2">{currentMilestone.icon}</div>
          <div className="font-medium text-yellow-800">{currentMilestone.name}</div>
          <div className="text-sm text-yellow-600">Current streak achievement</div>
        </div>
      )}
      
      {/* Next milestone */}
      {nextMilestone && (
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg mb-1">{nextMilestone.icon}</div>
          <div className="font-medium text-gray-700">{nextMilestone.name}</div>
          <div className="text-sm text-gray-500">
            {nextMilestone.days - currentStreak} days to go
          </div>
          <Progress 
            value={(currentStreak / nextMilestone.days) * 100} 
            className="h-2 mt-2"
          />
        </div>
      )}
      
      {/* Longest streak achievement */}
      {longestMilestone && longestStreak > currentStreak && (
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-lg mb-1">{longestMilestone.icon}</div>
          <div className="font-medium text-blue-800">Personal Best</div>
          <div className="text-sm text-blue-600">
            {longestStreak} day streak
          </div>
        </div>
      )}
    </div>
  );
}

// === MAIN COMPONENT ===

/**
 * FocusStreak component for displaying streak information and motivation
 */
export function FocusStreak({ 
  streak, 
  multiDayData, 
  showCalendar = true,
  customGoal
}: FocusStreakProps) {
  
  // === COMPUTED VALUES ===
  
  const goalMinutes = customGoal || streak.focusGoalMinutes;
  
  const streakHealth = useMemo(() => {
    if (streak.currentStreak === 0) return 'inactive';
    if (streak.currentStreak >= 7) return 'strong';
    if (streak.currentStreak >= 3) return 'building';
    return 'starting';
  }, [streak.currentStreak]);
  
  const streakColors = {
    inactive: 'text-gray-500',
    starting: 'text-orange-500',
    building: 'text-blue-500',
    strong: 'text-green-500'
  };
  
  // === RENDER ===
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className={`h-5 w-5 ${streakColors[streakHealth]}`} />
          Focus Streak
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main streak display */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className={`text-4xl font-bold ${streakColors[streakHealth]}`}>
                {streak.currentStreak}
              </div>
              <div className="text-sm text-gray-600">Current Streak</div>
            </div>
            
            <div className="w-px h-12 bg-gray-200" />
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">
                {streak.longestStreak}
              </div>
              <div className="text-sm text-gray-600">Personal Best</div>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            Daily goal: {formatDuration(goalMinutes)}
          </div>
        </div>
        
        {/* Streak status */}
        <div className="flex items-center justify-center gap-2">
          {streak.currentStreak > 0 ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Streak Active
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              Start New Streak
            </Badge>
          )}
          
          {streak.todayCount && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Today Complete
            </Badge>
          )}
        </div>
        
        {/* Key metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Current</span>
            </div>
            <div className="text-lg font-bold text-green-900">
              {streak.currentStreak} days
            </div>
            <div className="text-xs text-green-600">
              {streak.currentStreak > 0 ? 'Keep it up!' : 'Start today!'}
            </div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Award className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Best</span>
            </div>
            <div className="text-lg font-bold text-blue-900">
              {streak.longestStreak} days
            </div>
            <div className="text-xs text-blue-600">
              {streak.longestStreak > 0 ? 'Personal record' : 'No record yet'}
            </div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Goal</span>
            </div>
            <div className="text-lg font-bold text-purple-900">
              {formatDuration(goalMinutes)}
            </div>
            <div className="text-xs text-purple-600">
              Daily target
            </div>
          </div>
        </div>
        
        {/* Achievement section */}
        <Achievement 
          currentStreak={streak.currentStreak} 
          longestStreak={streak.longestStreak}
        />
        
        {/* Calendar view */}
        {showCalendar && (
          <StreakCalendar multiDayData={multiDayData} />
        )}
        
        {/* Motivational message */}
        <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="font-medium text-gray-800 mb-1">
            {streak.currentStreak === 0 && "Ready to start your focus journey?"}
            {streak.currentStreak > 0 && streak.currentStreak < 3 && "Great start! Keep building momentum."}
            {streak.currentStreak >= 3 && streak.currentStreak < 7 && "You're building a strong habit!"}
            {streak.currentStreak >= 7 && "Amazing consistency! You're a focus champion!"}
          </div>
          <div className="text-sm text-gray-600">
            {streak.currentStreak === 0 && "Hit your daily focus goal to start your streak"}
            {streak.currentStreak > 0 && !streak.todayCount && "Focus for " + formatDuration(goalMinutes) + " today to continue"}
            {streak.currentStreak > 0 && streak.todayCount && "Goal complete! See you tomorrow."}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 