// src/utils/dateUtils.js
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, format, parseISO, isToday,
  startOfYear, endOfYear,
} from 'date-fns';

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

export const shiftRange = (start, end, direction) => {
  const s = start instanceof Date ? start : new Date(start);
  const e = end   instanceof Date ? end   : new Date(end);

  // Full calendar month → shift by one month (Mar→Apr not Mar→May)
  const lastDay = new Date(e.getFullYear(), e.getMonth() + 1, 0).getDate();
  const isFullMonth = s.getDate() === 1 && e.getDate() === lastDay
    && s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth();
  if (isFullMonth) {
    const delta    = direction === 'forward' ? 1 : -1;
    const raw      = s.getMonth() + delta;
    const newYear  = s.getFullYear() + Math.floor(raw / 12);
    const newMonth = ((raw % 12) + 12) % 12;
    return { start: startOfMonth(new Date(newYear, newMonth, 1)), end: endOfMonth(new Date(newYear, newMonth, 1)) };
  }

  // Otherwise shift by number of days — use noon to avoid timezone/DST off-by-one
  const msPerDay = 1000 * 60 * 60 * 24;
  const sNoon = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 12);
  const eNoon = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 12);
  const days  = Math.round((eNoon - sNoon) / msPerDay) + 1;
  const delta = direction === 'forward' ? days : -days;
  return { start: addDays(s, delta), end: addDays(e, delta) };
};

export { isToday, format, parseISO, addDays };