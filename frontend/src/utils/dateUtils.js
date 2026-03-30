// src/utils/dateUtils.js
import {
  addDays, addWeeks, addMonths,
  startOfYear, endOfYear,
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  differenceInDays,
  format, isToday, parseISO,
} from 'date-fns';

export { addDays, format, isToday, parseISO };

export const fmt = (d) => format(d instanceof Date ? d : new Date(d), 'yyyy-MM-dd');

export const getWeekRange = (anchor = new Date()) => ({
  start: startOfWeek(anchor, { weekStartsOn: 1 }),
  end:   endOfWeek(anchor,   { weekStartsOn: 1 }),
});

export const getMonthRange = (anchor = new Date()) => ({
  start: startOfMonth(anchor),
  end:   endOfMonth(anchor),
});

export const getYearRange = (anchor = new Date()) => ({
  start: startOfYear(anchor),
  end:   endOfYear(anchor),
});

export const getTodayRange = () => ({ start: new Date(), end: new Date() });

export function shiftRange(start, end, direction) {
  const dir = direction === 'forward' ? 1 : -1;

  // ── Year range detection ──────────────────────────────
  const isFullYear =
    start.getDate()  === 1  && start.getMonth()  === 0 &&
    end.getDate()    === 31 && end.getMonth()    === 11 &&
    start.getFullYear() === end.getFullYear();

  if (isFullYear) {
    const newYear = start.getFullYear() + dir;
    return { start: new Date(newYear, 0, 1), end: new Date(newYear, 11, 31) };
  }

  // ── Month range detection ─────────────────────────────
  const isFullMonth =
    start.getDate() === 1 &&
    end.getTime()   === endOfMonth(start).getTime();

  if (isFullMonth) {
    const shifted = addMonths(start, dir);
    return { start: startOfMonth(shifted), end: endOfMonth(shifted) };
  }

  // ── Week range detection ──────────────────────────────
  const days = differenceInDays(end, start);
  if (days === 6) {
    const shifted = addWeeks(start, dir);
    return {
      start: startOfWeek(shifted, { weekStartsOn: 1 }),
      end:   endOfWeek(shifted,   { weekStartsOn: 1 }),
    };
  }

  // ── Default: shift by duration in days ───────────────
  const duration = days + 1;
  return {
    start: addDays(start, dir * duration),
    end:   addDays(end,   dir * duration),
  };
}