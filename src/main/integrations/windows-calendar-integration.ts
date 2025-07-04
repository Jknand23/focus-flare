/**
 * Windows Calendar Integration - Local Calendar Data Access
 * 
 * Provides read-only access to Windows Calendar data using PowerShell commands
 * to query the local calendar store. This integration maintains complete privacy
 * by only accessing data stored locally on the user's machine.
 * 
 * Features:
 * - Read-only access to calendar events
 * - Local data processing only
 * - Privacy-first design
 * - Meeting context correlation
 * 
 * @module WindowsCalendarIntegration
 * @author FocusFlare Team
 * @since Phase 4
 */

import { spawn } from 'child_process';
import type {
  WindowsCalendarEvent,
  CalendarIntegrationConfig,
  TimeRange,
  IntegrationQueryOptions
} from '@/shared/types/windows-integration-types';

// === TYPES ===

/**
 * Raw calendar event data from PowerShell
 */
interface RawCalendarEvent {
  Subject: string;
  Start: string;
  End: string;
  Location?: string;
  IsAllDay: boolean;
  BusyStatus: string;
  Categories?: string;
  Body?: string;
  Sensitivity: string;
  Organizer?: string;
  RequiredAttendees?: string;
  OptionalAttendees?: string;
  Resources?: string;
  CalendarName?: string;
  Recurrence?: any;
}

/**
 * PowerShell execution result
 */
interface PowerShellResult {
  stdout: string;
  stderr: string;
  success: boolean;
  error?: Error;
}

// === CONSTANTS ===

/** Default configuration for calendar integration */
const DEFAULT_CONFIG: CalendarIntegrationConfig = {
  enabled: false,
  includedCalendars: [],
  excludedCalendars: [],
  lookAheadDays: 7,
  lookBehindDays: 1,
  includeAllDayEvents: true,
  minEventDuration: 0
};

/** PowerShell command to get calendar events */
const CALENDAR_QUERY_COMMAND = `
# Get calendar events using Outlook COM object
try {
  $outlook = New-Object -ComObject Outlook.Application
  $namespace = $outlook.GetNameSpace("MAPI")
  $calendar = $namespace.GetDefaultFolder(9) # Calendar folder
  
  # Define date range
  $startDate = (Get-Date).AddDays(-{lookBehindDays}).Date
  $endDate = (Get-Date).AddDays({lookAheadDays}).Date
  
  # Get appointments in range
  $appointments = $calendar.Items | Where-Object { 
    $_.Start -ge $startDate -and $_.Start -le $endDate 
  }
  
  # Format results as JSON
  $events = @()
  foreach ($appointment in $appointments) {
    $event = @{
      Subject = $appointment.Subject
      Start = $appointment.Start.ToString("yyyy-MM-ddTHH:mm:ss")
      End = $appointment.End.ToString("yyyy-MM-ddTHH:mm:ss")
      Location = $appointment.Location
      IsAllDay = $appointment.AllDayEvent
      BusyStatus = $appointment.BusyStatus
      Categories = $appointment.Categories
      Body = $appointment.Body
      Sensitivity = $appointment.Sensitivity
      Organizer = $appointment.Organizer
      RequiredAttendees = $appointment.RequiredAttendees
      OptionalAttendees = $appointment.OptionalAttendees
      Resources = $appointment.Resources
      CalendarName = $appointment.Parent.Name
    }
    $events += $event
  }
  
  $events | ConvertTo-Json -Depth 3
} catch {
  Write-Error "Failed to access calendar: $_"
  "[]"
}
`;

/** Alternative PowerShell command using Windows.ApplicationModel.Appointments */
const WINDOWS_CALENDAR_QUERY_COMMAND = `
# Get calendar events using Windows Runtime APIs
try {
  # Load Windows Runtime assemblies
  Add-Type -AssemblyName "Windows.ApplicationModel, Version=10.0.0.0, Culture=neutral, PublicKeyToken=null, ContentType=WindowsRuntime"
  Add-Type -AssemblyName "Windows.ApplicationModel.Appointments, Version=10.0.0.0, Culture=neutral, PublicKeyToken=null, ContentType=WindowsRuntime"
  
  # Create appointment manager
  $appointmentManager = [Windows.ApplicationModel.Appointments.AppointmentManager]::RequestStoreAsync([Windows.ApplicationModel.Appointments.AppointmentStoreAccessType]::ReadOnly).Result
  
  # Define date range
  $startDate = (Get-Date).AddDays(-{lookBehindDays}).Date
  $endDate = (Get-Date).AddDays({lookAheadDays}).Date
  
  # Get appointments
  $appointments = $appointmentManager.FindAppointmentsAsync($startDate, $endDate.Subtract($startDate)).Result
  
  # Format results as JSON
  $events = @()
  foreach ($appointment in $appointments) {
    $event = @{
      Subject = $appointment.Subject
      Start = $appointment.StartTime.ToString("yyyy-MM-ddTHH:mm:ss")
      End = $appointment.StartTime.Add($appointment.Duration).ToString("yyyy-MM-ddTHH:mm:ss")
      Location = $appointment.Location
      IsAllDay = $appointment.AllDay
      BusyStatus = $appointment.BusyStatus.ToString()
      Categories = $appointment.Categories -join ","
      Body = $appointment.Details
      Sensitivity = $appointment.Sensitivity.ToString()
      Organizer = $appointment.Organizer
      CalendarName = "Windows Calendar"
    }
    $events += $event
  }
  
  $events | ConvertTo-Json -Depth 3
} catch {
  Write-Error "Failed to access Windows Calendar: $_"
  "[]"
}
`;

// === MAIN CLASS ===

/**
 * Windows Calendar Integration Manager
 * 
 * Manages read-only access to Windows Calendar data using PowerShell commands
 * to query the local calendar store. Provides meeting context for productivity
 * insights while maintaining complete privacy.
 */
export class WindowsCalendarIntegration {
  private config: CalendarIntegrationConfig;
  private isAvailable: boolean = false;
  private lastSync: Date | null = null;
  private eventCache: Map<string, WindowsCalendarEvent> = new Map();

  constructor(config: Partial<CalendarIntegrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.log = this.log.bind(this);
    this.logError = this.logError.bind(this);
  }

  // === LIFECYCLE METHODS ===

  /**
   * Initialize the calendar integration and check availability
   */
  async initialize(): Promise<void> {
    try {
      this.log('Initializing Windows Calendar Integration...');
      
      // Check if calendar access is available
      this.isAvailable = await this.checkCalendarAvailability();
      
      if (!this.isAvailable) {
        this.log('Calendar access not available - integration disabled');
        return;
      }

      this.log('Windows Calendar Integration initialized successfully');
    } catch (error) {
      this.logError('Failed to initialize calendar integration:', error);
      this.isAvailable = false;
    }
  }

  /**
   * Check if calendar access is available on this system
   */
  private async checkCalendarAvailability(): Promise<boolean> {
    try {
      // Test basic PowerShell calendar access
      const result = await this.executePowerShell(`
        try {
          $outlook = New-Object -ComObject Outlook.Application -ErrorAction Stop
          $namespace = $outlook.GetNameSpace("MAPI")
          $calendar = $namespace.GetDefaultFolder(9)
          "available"
        } catch {
          try {
            Add-Type -AssemblyName "Windows.ApplicationModel.Appointments, Version=10.0.0.0, Culture=neutral, PublicKeyToken=null, ContentType=WindowsRuntime" -ErrorAction Stop
            "available"
          } catch {
            "unavailable"
          }
        }
      `);

      return result.success && result.stdout.trim() === 'available';
    } catch (error) {
      this.logError('Calendar availability check failed:', error);
      return false;
    }
  }

  // === CALENDAR DATA ACCESS ===

  /**
   * Retrieve calendar events for the specified time range
   */
  async getCalendarEvents(options: IntegrationQueryOptions = {}): Promise<WindowsCalendarEvent[]> {
    try {
      if (!this.isAvailable || !this.config.enabled) {
        this.log('Calendar integration not available or disabled');
        return [];
      }

      const timeRange = options.timeRange || {
        start: new Date(Date.now() - (this.config.lookBehindDays * 24 * 60 * 60 * 1000)),
        end: new Date(Date.now() + (this.config.lookAheadDays * 24 * 60 * 60 * 1000))
      };

      this.log(`Fetching calendar events from ${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}`);

      // Try Outlook COM first, then Windows Runtime
      let rawEvents: RawCalendarEvent[] = [];
      
      try {
        rawEvents = await this.getOutlookEvents(timeRange);
      } catch (outlookError) {
        this.log('Outlook COM access failed, trying Windows Runtime...');
        try {
          rawEvents = await this.getWindowsCalendarEvents(timeRange);
        } catch (windowsError) {
          this.logError('Both calendar access methods failed:', windowsError);
          return [];
        }
      }

      // Process and filter events
      const events = this.processRawEvents(rawEvents);
      
      // Apply additional filtering
      const filteredEvents = this.filterEvents(events);
      
      // Cache events
      this.cacheEvents(filteredEvents);
      
      this.lastSync = new Date();
      this.log(`Successfully retrieved ${filteredEvents.length} calendar events`);
      
      return filteredEvents;
    } catch (error) {
      this.logError('Failed to get calendar events:', error);
      return [];
    }
  }

  /**
   * Get calendar events using Outlook COM
   */
  private async getOutlookEvents(timeRange: TimeRange): Promise<RawCalendarEvent[]> {
    const command = CALENDAR_QUERY_COMMAND
      .replace('{lookBehindDays}', Math.ceil((Date.now() - timeRange.start.getTime()) / (24 * 60 * 60 * 1000)).toString())
      .replace('{lookAheadDays}', Math.ceil((timeRange.end.getTime() - Date.now()) / (24 * 60 * 60 * 1000)).toString());

    const result = await this.executePowerShell(command);
    
    if (!result.success) {
      throw new Error(`Outlook COM access failed: ${result.stderr}`);
    }

    try {
      const events = JSON.parse(result.stdout);
      return Array.isArray(events) ? events : [];
    } catch (parseError) {
      throw new Error(`Failed to parse Outlook calendar data: ${parseError}`);
    }
  }

  /**
   * Get calendar events using Windows Runtime APIs
   */
  private async getWindowsCalendarEvents(timeRange: TimeRange): Promise<RawCalendarEvent[]> {
    const command = WINDOWS_CALENDAR_QUERY_COMMAND
      .replace('{lookBehindDays}', Math.ceil((Date.now() - timeRange.start.getTime()) / (24 * 60 * 60 * 1000)).toString())
      .replace('{lookAheadDays}', Math.ceil((timeRange.end.getTime() - Date.now()) / (24 * 60 * 60 * 1000)).toString());

    const result = await this.executePowerShell(command);
    
    if (!result.success) {
      throw new Error(`Windows Calendar access failed: ${result.stderr}`);
    }

    try {
      const events = JSON.parse(result.stdout);
      return Array.isArray(events) ? events : [];
    } catch (parseError) {
      throw new Error(`Failed to parse Windows calendar data: ${parseError}`);
    }
  }

  // === DATA PROCESSING ===

  /**
   * Process raw calendar events into structured format
   */
  private processRawEvents(rawEvents: RawCalendarEvent[]): WindowsCalendarEvent[] {
    return rawEvents.map(event => this.processRawEvent(event)).filter(event => event !== null) as WindowsCalendarEvent[];
  }

  /**
   * Process a single raw calendar event
   */
  private processRawEvent(raw: RawCalendarEvent): WindowsCalendarEvent | null {
    try {
      const startTime = new Date(raw.Start);
      const endTime = new Date(raw.End);
      
      // Validate dates
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        this.log(`Invalid date in calendar event: ${raw.Subject}`);
        return null;
      }

      // Generate unique ID
      const id = `${raw.Subject}-${startTime.getTime()}-${endTime.getTime()}`;

      return {
        id,
        title: raw.Subject || 'Untitled Event',
        description: raw.Body || undefined,
        startTime,
        endTime,
        location: raw.Location || undefined,
        isAllDay: raw.IsAllDay || false,
        attendeesCount: this.countAttendees(raw),
        status: this.mapBusyStatus(raw.BusyStatus),
        calendar: raw.CalendarName || 'Default'
      };
    } catch (error) {
      this.logError(`Failed to process calendar event: ${raw.Subject}`, error);
      return null;
    }
  }

  /**
   * Count attendees from raw event data
   */
  private countAttendees(raw: RawCalendarEvent): number {
    let count = 0;
    if (raw.RequiredAttendees) count += raw.RequiredAttendees.split(';').length;
    if (raw.OptionalAttendees) count += raw.OptionalAttendees.split(';').length;
    return count;
  }

  /**
   * Map busy status to standard format
   */
  private mapBusyStatus(status: string): 'busy' | 'free' | 'tentative' | 'outOfOffice' {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('free')) return 'free';
    if (statusLower.includes('tentative')) return 'tentative';
    if (statusLower.includes('outofoffice') || statusLower.includes('out of office')) return 'outOfOffice';
    return 'busy';
  }

  /**
   * Filter events based on configuration
   */
  private filterEvents(events: WindowsCalendarEvent[]): WindowsCalendarEvent[] {
    return events.filter(event => {
      // Filter by minimum duration
      const duration = event.endTime.getTime() - event.startTime.getTime();
      if (duration < this.config.minEventDuration * 60 * 1000) {
        return false;
      }

      // Filter by all-day events
      if (event.isAllDay && !this.config.includeAllDayEvents) {
        return false;
      }

      // Filter by included calendars
      if (this.config.includedCalendars.length > 0 && !this.config.includedCalendars.includes(event.calendar)) {
        return false;
      }

      // Filter by excluded calendars
      if (this.config.excludedCalendars.includes(event.calendar)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Cache events for quick access
   */
  private cacheEvents(events: WindowsCalendarEvent[]): void {
    this.eventCache.clear();
    events.forEach(event => {
      this.eventCache.set(event.id, event);
    });
  }

  // === UTILITY METHODS ===

  /**
   * Execute PowerShell command
   */
  private async executePowerShell(command: string): Promise<PowerShellResult> {
    return new Promise((resolve) => {
      const process = spawn('powershell', ['-Command', command], {
        stdio: 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          success: code === 0,
          error: code !== 0 ? new Error(`PowerShell exited with code ${code}`) : undefined
        });
      });

      process.on('error', (error) => {
        resolve({
          stdout,
          stderr,
          success: false,
          error
        });
      });
    });
  }

  /**
   * Get integration status
   */
  getStatus(): { available: boolean; enabled: boolean; lastSync?: Date; eventCount: number } {
    return {
      available: this.isAvailable,
      enabled: this.config.enabled,
      lastSync: this.lastSync || undefined,
      eventCount: this.eventCache.size
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CalendarIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('Calendar integration configuration updated');
  }

  // === LOGGING ===

  private log(message: string, ...args: any[]): void {
    console.log(`[WindowsCalendarIntegration] ${message}`, ...args);
  }

  private logError(message: string, error?: any): void {
    console.error(`[WindowsCalendarIntegration] ${message}`, error);
  }
}

// === SINGLETON INSTANCE ===

/** Global calendar integration instance */
let calendarIntegrationInstance: WindowsCalendarIntegration | null = null;

/**
 * Get or create the calendar integration singleton
 */
export function getCalendarIntegration(config?: Partial<CalendarIntegrationConfig>): WindowsCalendarIntegration {
  if (!calendarIntegrationInstance) {
    calendarIntegrationInstance = new WindowsCalendarIntegration(config);
  }
  return calendarIntegrationInstance;
}

/**
 * Initialize calendar integration
 */
export async function initializeCalendarIntegration(config?: Partial<CalendarIntegrationConfig>): Promise<WindowsCalendarIntegration> {
  const integration = getCalendarIntegration(config);
  await integration.initialize();
  return integration;
}

// === EXPORTS ===

// Class is already exported above
export type { CalendarIntegrationConfig, WindowsCalendarEvent }; 