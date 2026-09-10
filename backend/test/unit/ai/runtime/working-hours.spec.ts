import { isWithinWorkingHours } from '../../../../src/modules/ai/runtime/working-hours';

/**
 * 2026-09-10 is a Thursday.
 *
 * Cairo is **UTC+3 on this date, not UTC+2**: Egypt reinstated summer time in
 * 2023, so the offset is +2 in winter and +3 between April and October. The
 * helper below therefore converts from the intended *Cairo* wall clock rather
 * than hard-coding a UTC hour, which is what makes these assertions readable
 * and stops the next reader repeating the mistake.
 *
 * `isWithinWorkingHours` reads the wall clock through Intl with the timezone,
 * so it gets this right for free — these tests exist to keep it that way.
 */
const CAIRO = 'Africa/Cairo';
const CAIRO_OFFSET_HOURS = 3;

/** A Date whose Cairo wall clock is exactly `hour:minute` on 2026-09-10. */
const cairo = (hour: number, minute = 0): Date =>
  new Date(Date.UTC(2026, 8, 10, hour - CAIRO_OFFSET_HOURS, minute, 0));

describe('working hours', () => {
  it('confirms the offset these cases assume', () => {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: CAIRO,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(cairo(9, 30));
    expect(formatted).toBe('Thu 09:30');
  });

  it('treats null as 24/7', () => {
    expect(isWithinWorkingHours(null, CAIRO, cairo(3))).toBe(true);
  });

  it('accepts a time inside the window', () => {
    expect(isWithinWorkingHours({ thu: '09:00-17:00' }, CAIRO, cairo(10))).toBe(
      true,
    );
  });

  it('rejects a time before the window opens', () => {
    expect(
      isWithinWorkingHours({ thu: '09:00-17:00' }, CAIRO, cairo(8, 30)),
    ).toBe(false);
  });

  it('rejects a time after the window closes', () => {
    expect(
      isWithinWorkingHours({ thu: '09:00-17:00' }, CAIRO, cairo(17, 1)),
    ).toBe(false);
  });

  it('treats the closing minute as closed', () => {
    expect(
      isWithinWorkingHours({ thu: '09:00-17:00' }, CAIRO, cairo(17, 0)),
    ).toBe(false);
  });

  it('treats a day absent from the map as closed', () => {
    expect(isWithinWorkingHours({ thu: '09:00-17:00' }, CAIRO, cairo(11))).toBe(
      true,
    );
    // Thursday is not in a Sunday-only map.
    expect(isWithinWorkingHours({ sun: '09:00-17:00' }, CAIRO, cairo(11))).toBe(
      false,
    );
  });

  it('treats a zero-length window as closed', () => {
    expect(isWithinWorkingHours({ thu: '09:00-09:00' }, CAIRO, cairo(9))).toBe(
      false,
    );
  });

  /**
   * An overnight entry is anchored to the day it STARTS on. `thu: '20:00-04:00'`
   * covers Thursday 20:00 onwards; the 00:00-04:00 tail is only reached when the
   * local day itself is configured, so a window that should run into Friday
   * morning needs a `fri` entry too. Documented rather than "fixed", because
   * anchoring to the start day is what makes an absent day mean closed.
   */
  it('supports an overnight window on its starting day', () => {
    expect(isWithinWorkingHours({ thu: '20:00-04:00' }, CAIRO, cairo(21))).toBe(
      true,
    );
    expect(isWithinWorkingHours({ thu: '20:00-04:00' }, CAIRO, cairo(5))).toBe(
      false,
    );
  });

  it('covers the after-midnight tail only when that day is configured too', () => {
    // 01:00 Cairo on Friday.
    const fridayEarly = new Date(Date.UTC(2026, 8, 10, 22, 0, 0));
    expect(
      isWithinWorkingHours({ thu: '20:00-04:00' }, CAIRO, fridayEarly),
    ).toBe(false);
    expect(
      isWithinWorkingHours(
        { thu: '20:00-04:00', fri: '20:00-04:00' },
        CAIRO,
        fridayEarly,
      ),
    ).toBe(true);
  });

  it('honours the configured timezone, not the server clock', () => {
    const instant = cairo(10);
    expect(isWithinWorkingHours({ thu: '09:00-17:00' }, CAIRO, instant)).toBe(
      true,
    );
    // The same instant is 07:00 UTC, before a UTC-configured window opens.
    expect(isWithinWorkingHours({ thu: '09:00-17:00' }, 'UTC', instant)).toBe(
      false,
    );
  });

  it('never silently mutes the agent on an unreadable clock', () => {
    expect(
      isWithinWorkingHours({ thu: '09:00-17:00' }, 'Not/AZone', cairo(11)),
    ).toBe(true);
  });
});
