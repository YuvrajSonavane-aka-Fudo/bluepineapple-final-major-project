// src/utils/dateUtils.js
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths,
  format, eachDayOfInterval, parseISO, isToday,
  startOfYear,
  endOfYear,
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
  const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const delta = direction === 'forward' ? days : -days;
  return { start: addDays(start, delta), end: addDays(end, delta) };
};

export { isToday, format, parseISO, addDays };
