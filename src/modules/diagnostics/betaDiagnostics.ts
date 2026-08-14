export const BETA_BUILD_VERSION = '0.9.0-beta.3';
export const BETA_BUILD_TIMESTAMP = '2026.08.14.1842';

export interface TelemetryEvent {
  eventId: string;
  timestamp: string;
  appVersion: string;
  buildTimestamp: string;
  currentView: string;
  action: string;
  errorCategory?: string;
  isOnline: boolean;
  pendingOutboxCount: number;
  teamContextId?: string;
  ruleSetVersion?: number;
}

const TELEMETRY_STORAGE_KEY = 'inside_edge_beta_telemetry_v1';
let inMemoryEvents: TelemetryEvent[] = [];

function loadEvents(): TelemetryEvent[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const data = localStorage.getItem(TELEMETRY_STORAGE_KEY);
      if (data) return JSON.parse(data) as TelemetryEvent[];
    } catch {
      // Fallback
    }
  }
  return inMemoryEvents;
}

function saveEvents(events: TelemetryEvent[]): void {
  inMemoryEvents = [...events];
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(events.slice(-100))); // Keep last 100
    } catch (err) {
      console.error('Failed to save telemetry:', err);
    }
  }
}

/**
 * Sanitizes input to ensure private coaching observations, notes, or PDF text are strictly redacted (2A-09).
 */
export function sanitizeContext(contextData: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const prohibitedKeys = ['observationText', 'privateNotes', 'notes', 'rawContent', 'pdfContent', 'playerNotes', 'email', 'phone'];

  Object.entries(contextData).forEach(([key, val]) => {
    if (prohibitedKeys.includes(key)) {
      sanitized[key] = '[REDACTED_PRIVATE_CONTENT]';
    } else if (typeof val === 'string' && val.length > 200) {
      sanitized[key] = `${val.slice(0, 50)}... [REDACTED_LONG_TEXT]`;
    } else {
      sanitized[key] = val;
    }
  });

  return sanitized;
}

export const BetaDiagnostics = {
  logEvent(action: string, currentView: string, meta: { errorCategory?: string; teamContextId?: string; ruleSetVersion?: number } = {}): TelemetryEvent {
    const events = loadEvents();
    const event: TelemetryEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      appVersion: BETA_BUILD_VERSION,
      buildTimestamp: BETA_BUILD_TIMESTAMP,
      currentView,
      action,
      errorCategory: meta.errorCategory,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingOutboxCount: 0,
      teamContextId: meta.teamContextId,
      ruleSetVersion: meta.ruleSetVersion
    };

    events.push(event);
    saveEvents(events);
    return event;
  },

  getRecentEvents(): TelemetryEvent[] {
    return loadEvents();
  },

  clearEvents(): void {
    inMemoryEvents = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TELEMETRY_STORAGE_KEY);
    }
  }
};
