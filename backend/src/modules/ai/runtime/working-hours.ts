/**
 * Working-hours evaluation for the agent, using the same shape the
 * organization profile already seeds: `{ sun: '09:00-17:00', ... }` where an
 * absent day means closed, and the clock is the organization's configured
 * timezone (`GeneralSettings.timeZone`). `workingHours === null` means 24/7.
 */
interface DayHours {
  open: string;
  close: string;
}

const DAY_CODES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
type DayCode = (typeof DAY_CODES)[number];

const RANGE = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/;

const parseDay = (value: unknown): DayHours | null => {
  if (typeof value !== 'string') return null;
  const match = RANGE.exec(value.trim());
  if (!match) return null;
  const [, openH, openM, closeH, closeM] = match;
  return {
    open: `${openH}:${openM}`,
    close: `${closeH}:${closeM}`,
  };
};

const minutesOf = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const localParts = (
  timezone: string,
  now: Date,
): { day: DayCode; minutes: number } | null => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const weekday = parts.find((part) => part.type === 'weekday')?.value ?? '';
    const hour = Number(parts.find((part) => part.type === 'hour')?.value);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value);
    const day = weekday.slice(0, 3).toLowerCase() as DayCode;
    if (
      !DAY_CODES.includes(day) ||
      !Number.isFinite(hour) ||
      !Number.isFinite(minute)
    )
      return null;
    const normalizedHour = hour === 24 ? 0 : hour;
    return { day, minutes: normalizedHour * 60 + minute };
  } catch {
    return null;
  }
};

export const isWithinWorkingHours = (
  workingHours: unknown,
  timezone: string,
  now: Date = new Date(),
): boolean => {
  if (workingHours === null || workingHours === undefined) return true;
  if (typeof workingHours !== 'object') return true;
  const local = localParts(timezone, now);
  if (!local) return true; // an unreadable clock must never silently mute the agent
  const hours = parseDay((workingHours as Record<string, unknown>)[local.day]);
  if (!hours) return false; // the day is configured closed
  const open = minutesOf(hours.open);
  const close = minutesOf(hours.close);
  if (close === open) return false; // a zero-length window is closed
  // Overnight windows (close <= open) span midnight.
  if (close < open) return local.minutes >= open || local.minutes < close;
  return local.minutes >= open && local.minutes < close;
};
