import { useState, useEffect } from 'react';
import {
  format, addMonths, subMonths, startOfMonth,
  startOfWeek, addDays, isSameDay, isSameMonth,
  isWithinInterval, isBefore
} from 'date-fns';
import { getWeekRange, getMonthRange, getTodayRange, getYearRange, shiftRange } from '../../utils/dateUtils';
import { useAuth } from '../../hooks/useAuth';
import {
  Box, Typography, Button, IconButton, Menu, MenuItem,
  Checkbox, Tooltip, Dialog, DialogContent, DialogActions, Popover,
} from '@mui/material';
import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined';
import CachedOutlinedIcon from '@mui/icons-material/CachedOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LogoutIcon from '@mui/icons-material/Logout';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';

/* ─────────────────────────────────────────────
   Mini Calendar
───────────────────────────────────────────── */
function MiniCalendar({ viewDate, onViewDateChange, tempStart, tempEnd, hoverDate, onDayClick, onDayHover }) {
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = startOfMonth(viewDate);
  const gridStart = startOfWeek(firstDay, { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  const getDayState = (day) => {
    const isStart = tempStart && isSameDay(day, tempStart);
    const isEnd = tempEnd && isSameDay(day, tempEnd);
    let inRange = false;
    if (tempStart && tempEnd) {
      inRange = isWithinInterval(day, { start: tempStart, end: tempEnd });
    } else if (tempStart && hoverDate && !isBefore(hoverDate, tempStart)) {
      inRange = isWithinInterval(day, { start: tempStart, end: hoverDate });
    }
    return { isStart, isEnd, inRange, isOther: !isSameMonth(day, viewDate) };
  };

  const gridItemSx = (isActive) => ({
    py: 1, px: 0.5, borderRadius: '8px', border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 600, outline: 'none',
    background: isActive ? '#1e2d5a' : 'transparent',
    color: isActive ? '#fff' : '#374151',
    '&:hover': { background: isActive ? '#1e2d5a' : '#f0f2f5' },
    '&:focus-visible': { background: isActive ? '#1e2d5a' : '#e8ecf5', outline: '2px solid #1e2d5a', outlineOffset: '1px' },
  });

  const closeBtnSx = {
    background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280',
    display: 'flex', alignItems: 'center', p: 0.25, borderRadius: '4px', outline: 'none',
    '&:focus-visible': { outline: '2px solid #1e2d5a', outlineOffset: '1px' },
  };

  if (showMonthPicker) {
    return (
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, px: 0.5 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1a1f2e' }}>Select Month</Typography>
          <Box component="button" onClick={() => setShowMonthPicker(false)} sx={closeBtnSx}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5 }}>
          {MONTHS.map((m, i) => (
            <Box key={m} component="button"
              onClick={() => { onViewDateChange(new Date(year, i, 1)); setShowMonthPicker(false); }}
              sx={gridItemSx(i === month)}>{m}</Box>
          ))}
        </Box>
      </Box>
    );
  }

  if (showYearPicker) {
    return (
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, px: 0.5 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1a1f2e' }}>Select Year</Typography>
          <Box component="button" onClick={() => setShowYearPicker(false)} sx={closeBtnSx}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5, maxHeight: 200, overflowY: 'auto' }}>
          {years.map(y => (
            <Box key={y} component="button"
              onClick={() => { onViewDateChange(new Date(y, month, 1)); setShowYearPicker(false); }}
              sx={gridItemSx(y === year)}>{y}</Box>
          ))}
        </Box>
      </Box>
    );
  }

  const navBtnSx = {
    background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
    alignItems: 'center', p: 0.25, borderRadius: '4px', color: '#6b7280', outline: 'none',
    '&:hover': { background: '#f0f2f5' },
    '&:focus-visible': { background: '#f0f2f5', outline: '2px solid #1e2d5a', outlineOffset: '1px' },
  };

  const headerBtnSx = {
    background: 'none', border: '1px solid transparent', borderRadius: '4px',
    cursor: 'pointer', px: 0.75, py: 0.1, fontSize: 11, fontWeight: 700,
    color: '#1a1f2e', outline: 'none',
    '&:hover': { background: '#f0f2f5', borderColor: '#e5e7eb' },
    '&:focus-visible': { background: '#e8ecf5', borderColor: '#1e2d5a', outline: '2px solid #1e2d5a', outlineOffset: '1px' },
  };

  return (
    <Box sx={{ userSelect: 'none' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.25, mb: 0.25 }}>
        <Box component="button" onClick={() => onViewDateChange(subMonths(viewDate, 1))} sx={navBtnSx}>
          <ChevronLeftIcon sx={{ fontSize: 14 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
          <Box component="button" onClick={() => setShowMonthPicker(true)} sx={headerBtnSx}>{MONTHS[month]}</Box>
          <Box component="button" onClick={() => setShowYearPicker(true)} sx={headerBtnSx}>{year}</Box>
        </Box>
        <Box component="button" onClick={() => onViewDateChange(addMonths(viewDate, 1))} sx={navBtnSx}>
          <ChevronRightIcon sx={{ fontSize: 14 }} />
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.1 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Box key={i} sx={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#9aa0ad', py: 0.1 }}>{d}</Box>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((day, i) => {
          const { isStart, isEnd, inRange, isOther } = getDayState(day);
          const isSelected = isStart || isEnd;
          const isToday = isSameDay(day, new Date());

          const rangeBg = (() => {
            if (!inRange) return {};
            if (isStart && !isEnd) return { left: '50%', right: 0 };
            if (isEnd && !isStart) return { left: 0, right: '50%' };
            return { left: 0, right: 0 };
          })();

          return (
            <Box key={i} component="button"
              onClick={() => onDayClick(day)}
              onMouseEnter={() => onDayHover(day)}
              sx={{
                position: 'relative', height: 24, border: 'none',
                cursor: 'pointer', background: 'none', p: 0, outline: 'none',
                '&:focus-visible .day-circle': { outline: '2px solid #1e2d5a', outlineOffset: '1px' },
              }}
            >
              {inRange && (
                <Box sx={{ position: 'absolute', top: 1, bottom: 1, ...rangeBg, background: '#e8ecf5', zIndex: 0 }} />
              )}
              <Box className="day-circle" sx={{
                position: 'relative', zIndex: 1,
                width: 22, height: 22, margin: '1px auto', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isSelected ? '#1e2d5a' : 'transparent',
                border: isToday && !isSelected ? '1.5px solid #1e2d5a' : 'none',
                fontSize: 10,
                fontWeight: isSelected || isToday ? 700 : 400,
                color: isSelected ? '#fff' : isOther ? '#c8cdd6' : '#1a1f2e',
              }}>
                {format(day, 'd')}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/* ─────────────────────────────────────────────
   Date Range Picker Popover
───────────────────────────────────────────── */
function DateRangePicker({ anchorEl, onClose, startDate, endDate, onApply }) {
  const open = Boolean(anchorEl);

  const [tempStart, setTempStart] = useState(null);
  const [tempEnd, setTempEnd] = useState(null);
  const [selecting, setSelecting] = useState('start');
  const [hoverDate, setHoverDate] = useState(null);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    if (open) {
      setTempStart(startDate || null);
      setTempEnd(endDate || null);
      setSelecting('start');
      setHoverDate(null);
      setViewDate(startDate || new Date());
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // const handleDayClick = (day) => {
  //   if (selecting === 'start') {
  //     setTempStart(day); setTempEnd(null); setSelecting('end');
  //   } else {
  //     if (isBefore(day, tempStart)) { setTempEnd(tempStart); setTempStart(day); }
  //     else { setTempEnd(day); }
  //     setSelecting('start');
  //   }
  // };

  const handleApply = () => {
    const s = tempStart;
    const e = tempEnd || tempStart;
    if (s) { onApply(s, e); onClose(); }
  };
  // ─── REPLACE handleDayClick inside DateRangePicker ───

  const handleDayClick = (day) => {
    if (selecting === 'start') {
      setTempStart(day);
      // Preserve end date UNLESS new start would be after it (invalid range)
      if (tempEnd && isBefore(tempEnd, day)) {
        setTempEnd(null);
      }
      setSelecting('end');
    } else {
      // Clicked a day before current start → swap: new day = start, old start = end
      if (isBefore(day, tempStart)) {
        setTempEnd(tempStart);
        setTempStart(day);
      } else {
        // Normal case: set end date, preserve start
        setTempEnd(day);
      }
      setSelecting('start');
    }
  };
  const fmtLabel = (d) => d ? format(d, 'MMM d, yyyy') : '—';

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      PaperProps={{ sx: { borderRadius: '10px', width: 228, mt: 0.5, boxShadow: '0 6px 24px rgba(0,0,0,0.15)', overflow: 'hidden' } }}
    >
      {/* Header */}
      <Box sx={{ background: '#1e2d5a', px: 1.25, py: 0.75, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>Select Date Range</Typography>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.8)', p: 0.1 }}>
          <CloseIcon sx={{ fontSize: 13 }} />
        </IconButton>
      </Box>

      {/* Start / End pills */}
      <Box sx={{ display: 'flex', px: 1, py: 0.75, gap: 0.5, background: '#f8f9fb', borderBottom: '1px solid #f0f2f5' }}>
        {[
          { label: 'Start', val: tempStart, active: selecting === 'start', onClick: () => setSelecting('start') },
          { label: 'End', val: tempEnd, active: selecting === 'end', onClick: () => { if (tempStart) setSelecting('end'); } },
        ].map(({ label, val, active, onClick }) => (
          <Box key={label} onClick={onClick} sx={{
            flex: 1, py: '4px', px: '6px', borderRadius: '6px', cursor: 'pointer',
            border: `1.5px solid ${active ? '#1e2d5a' : '#e5e7eb'}`,
            background: '#fff',
            boxShadow: active ? '0 0 0 2px rgba(30,45,90,0.08)' : 'none',
          }}>
            <Typography sx={{ fontSize: 8, fontWeight: 700, color: active ? '#1e2d5a' : '#9aa0ad', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</Typography>
            <Typography sx={{ fontSize: 10, fontWeight: 600, color: val ? '#1a1f2e' : '#c8cdd6', mt: 0.1 }}>{fmtLabel(val)}</Typography>
          </Box>
        ))}
      </Box>

      {/* Hint */}
      <Typography sx={{ fontSize: 8, color: '#9aa0ad', textAlign: 'center', pt: 0.5, fontWeight: 500 }}>
        {selecting === 'start' ? 'Click to set start date' : 'Click to set end date'}
      </Typography>

      {/* Calendar */}
      <Box sx={{ px: 0.75, pb: 0.75 }}>
        <MiniCalendar
          viewDate={viewDate}
          onViewDateChange={setViewDate}
          tempStart={tempStart}
          tempEnd={tempEnd}
          hoverDate={hoverDate}
          onDayClick={handleDayClick}
          onDayHover={setHoverDate}
        />
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 0.5, px: 1, pb: 1, pt: 0 }}>
        <Box component="button" onClick={onClose} sx={{
          flex: 1, py: '5px', borderRadius: '6px', border: '1px solid #e5e7eb',
          background: '#fff', color: '#6b7280', fontSize: 10, fontWeight: 600, cursor: 'pointer',
          '&:hover': { background: '#f9fafb' },
        }}>Cancel</Box>
        <Box component="button" onClick={handleApply} sx={{
          flex: 1, py: '5px', borderRadius: '6px', border: 'none',
          background: tempStart ? '#1e2d5a' : '#c0c7d6',
          color: '#fff', fontSize: 10, fontWeight: 600,
          cursor: tempStart ? 'pointer' : 'default',
          '&:hover': tempStart ? { background: '#162347' } : {},
        }}>Apply</Box>
      </Box>
    </Popover>
  );
}

/* ─────────────────────────────────────────────
   Validation
───────────────────────────────────────────── */
function validateRange(start, end) {
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()))
    return 'Please enter valid dates for both start and end.';
  if (end < start)
    return 'End date must be on or after the start date.';
  return null;
}

/* ─────────────────────────────────────────────
   Toolbar
───────────────────────────────────────────── */
export default function Toolbar({
  startDate, endDate, onRangeChange,
  projects, selectedProjectIds, onProjectsChange,
  leaveStatuses, onLeaveStatusesChange,
  leaveTypes, onLeaveTypesChange,
  onRefresh, onClear, loading,
}) {
  const { logout } = useAuth();
  const [projAnchor, setProjAnchor] = useState(null);
  const [statusAnchor, setStatusAnchor] = useState(null);
  const [typeAnchor, setTypeAnchor] = useState(null);
  const [showLogout, setShowLogout] = useState(false);
  const [datePickerAnchor, setDatePickerAnchor] = useState(null);
  const [dateError, setDateError] = useState(null);
  const [lastQuickFilter, setLastQuickFilter] = useState(null);

  const ALL_STATUSES = ['Approved', 'Pending', 'Rejected', 'Cancelled'];
  const ALL_TYPES = ['Paid', 'Unpaid', 'WFH', 'Half Day'];

  const getActiveFilter = () => {
    const same = (d1, d2) => d1.toDateString() === d2.toDateString();
    if (same(startDate, getTodayRange().start) && same(endDate, getTodayRange().end)) return 'T';
    if (same(startDate, getWeekRange().start) && same(endDate, getWeekRange().end)) return 'W';
    if (same(startDate, getMonthRange().start) && same(endDate, getMonthRange().end)) return 'M';
    if (same(startDate, getYearRange().start) && same(endDate, getYearRange().end)) return 'Y';
    return null;
  };

  // Exact match wins; arrow-key navigation keeps last clicked filter highlighted
  const activeFilter = getActiveFilter() ?? lastQuickFilter;
  const fmtDisplay = (d) => format(d instanceof Date ? d : new Date(d), 'MMM dd, yyyy');

  const toggleArr = (arr, val, setter) => {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const isAllSelected = (arr, all) => arr.length === 0 || arr.length === all.length;
  const activeLabel = (arr, all, label) => {
    if (isAllSelected(arr, all)) return label;
    return arr.length === 1 ? arr[0] : `${arr[0]} +${arr.length - 1}`;
  };

  const handleRangeChange = (newStart, newEnd) => {
    const err = validateRange(newStart, newEnd);
    if (err) { setDateError(err); return; }
    onRangeChange(newStart, newEnd);
  };

  const QUICK = [
    { label: 'T', tooltip: 'Today', fn: () => { const r = getTodayRange(); handleRangeChange(r.start, r.end); setLastQuickFilter('T'); } },
    { label: 'W', tooltip: 'Week', fn: () => { const r = getWeekRange(); handleRangeChange(r.start, r.end); setLastQuickFilter('W'); } },
    { label: 'M', tooltip: 'Month', fn: () => { const r = getMonthRange(); handleRangeChange(r.start, r.end); setLastQuickFilter('M'); } },
    { label: 'Y', tooltip: 'Year', fn: () => { const r = getYearRange(); handleRangeChange(r.start, r.end); setLastQuickFilter('Y'); } },
  ];

  const btnSx = {
    display: 'flex', alignItems: 'center', gap: '6px', px: 1.25, py: 0.75,
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '7px', color: '#fff', fontSize: 12, textTransform: 'none',
    fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap', minWidth: 0,
    '&:hover': { background: 'rgba(255,255,255,0.18)' },
  };

  const iconBtnSx = {
    width: 32, height: 32,
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '7px', color: 'rgba(255,255,255,0.8)',
    '&:hover': { background: 'rgba(255,255,255,0.18)' },
  };

  const menuProps = {
    PaperProps: { sx: { borderRadius: '10px', border: '1px solid #e8eaed', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', mt: 0.75, minWidth: 180 } },
    MenuListProps: { sx: { p: 0.75 } },
  };

  return (
    <>
      <Box sx={{ height: 52, background: '#1e2d5a', display: 'flex', alignItems: 'center', px: 2, gap: 1.5, flexShrink: 0, position: 'relative', zIndex: 10 }}>

        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
          <Box sx={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="2" fill="white" />
              <rect x="13" y="3" width="8" height="8" rx="2" fill="white" opacity="0.5" />
              <rect x="3" y="13" width="8" height="8" rx="2" fill="white" opacity="0.5" />
              <rect x="13" y="13" width="8" height="8" rx="2" fill="white" opacity="0.8" />
            </svg>
          </Box>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '-0.2px' }}>Leave Impact Dashboard</Typography>
        </Box>

        {/* Center */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline' }}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
            Filters:
          </Typography>

          {/* Prev arrow */}
          <IconButton onClick={() => { const r = shiftRange(startDate, endDate, 'back'); handleRangeChange(r.start, r.end); }} sx={{ ...iconBtnSx, width: 26, height: 26 }}>
            <ChevronLeftIcon sx={{ fontSize: 14 }} />
          </IconButton>

          {/* Date range pill — opens calendar popover */}
          <Box
            onClick={(e) => setDatePickerAnchor(e.currentTarget)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.75,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '7px', px: 1, py: 0.4, cursor: 'pointer',
              '&:hover': { background: 'rgba(255,255,255,0.18)' },
            }}
          >
            <CalendarTodayIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }} />
            <Typography sx={{ color: '#fff', fontSize: 12, fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap' }}>
              {fmtDisplay(startDate)}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, pb: '2px' }}>—</Typography>
            <Typography sx={{ color: '#fff', fontSize: 12, fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap' }}>
              {fmtDisplay(endDate)}
            </Typography>
          </Box>

          {/* Next arrow */}
          <IconButton onClick={() => { const r = shiftRange(startDate, endDate, 'forward'); handleRangeChange(r.start, r.end); }} sx={{ ...iconBtnSx, width: 26, height: 26 }}>
            <ChevronRightIcon sx={{ fontSize: 14 }} />
          </IconButton>

          {/* Quick filters T W M Y */}
          <Box sx={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '7px', p: '2px' }}>
            {QUICK.map(({ label, tooltip, fn }) => (
              <Tooltip key={label} title={tooltip} placement="bottom">
                <Button onClick={fn} sx={{
                  minWidth: 0, px: 1.25, py: 0.5, borderRadius: '5px', fontSize: 11, fontWeight: 700,
                  color: activeFilter === label ? '#fff' : 'rgba(255,255,255,0.7)',
                  background: activeFilter === label ? 'rgba(255,255,255,0.25)' : 'transparent',
                  '&:hover': { background: 'rgba(255,255,255,0.15)' },
                }}>{label}</Button>
              </Tooltip>
            ))}
          </Box>

          <Box sx={{ height: 20, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />

          {/* Projects */}
          <Button onClick={e => { setProjAnchor(e.currentTarget); setStatusAnchor(null); setTypeAnchor(null); }} endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 12 }} />} sx={btnSx}>
            <Box component="span" sx={{ display: 'inline-flex', width: 15, height: 15, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>P</Box>
            {selectedProjectIds.length === 0 ? `Projects (${projects.length})` : `${selectedProjectIds.length} Projects`}
          </Button>
          <Menu anchorEl={projAnchor} open={Boolean(projAnchor)} onClose={() => setProjAnchor(null)} {...menuProps}
            PaperProps={{ ...menuProps.PaperProps, sx: { ...menuProps.PaperProps.sx, maxHeight: 260, overflowY: 'auto', maxWidth: 320 } }}>
            <MenuItem onClick={e => { e.stopPropagation(); onProjectsChange([]); }} sx={{ borderRadius: '6px', fontSize: 13, gap: 1 }}>
              <Checkbox checked={selectedProjectIds.length === 0} size="small" sx={{ p: 0 }} /> All
            </MenuItem>
            {projects.map(p => (
              <MenuItem key={p.project_id} onClick={e => { e.stopPropagation(); toggleArr(selectedProjectIds, p.project_id, onProjectsChange); }} sx={{ borderRadius: '6px', fontSize: 13, gap: 1, background: selectedProjectIds.includes(p.project_id) ? '#f0f7ff' : 'transparent' }}>
                <Checkbox checked={selectedProjectIds.includes(p.project_id)} size="small" sx={{ p: 0 }} /> {p.project_name}
              </MenuItem>
            ))}
          </Menu>

          {/* Status */}
          <Button onClick={e => { setStatusAnchor(e.currentTarget); setProjAnchor(null); setTypeAnchor(null); }} endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 12 }} />} sx={btnSx}>
            <FiberManualRecordIcon sx={{ fontSize: 10, color: '#16a34a' }} />
            {activeLabel(leaveStatuses, ALL_STATUSES, 'Status')}
          </Button>
          <Menu anchorEl={statusAnchor} open={Boolean(statusAnchor)} onClose={() => setStatusAnchor(null)} {...menuProps}>
            <MenuItem onClick={e => { e.stopPropagation(); onLeaveStatusesChange([]); }} sx={{ borderRadius: '6px', fontSize: 13, gap: 1 }}>
              <Checkbox checked={isAllSelected(leaveStatuses, ALL_STATUSES)} size="small" sx={{ p: 0 }} /> All
            </MenuItem>
            {ALL_STATUSES.map(st => (
              <MenuItem key={st} onClick={e => { e.stopPropagation(); toggleArr(leaveStatuses, st, onLeaveStatusesChange); }} sx={{ borderRadius: '6px', fontSize: 13, gap: 1, background: leaveStatuses.includes(st) ? '#f0f7ff' : 'transparent' }}>
                <Checkbox checked={leaveStatuses.includes(st)} size="small" sx={{ p: 0 }} /> {st}
              </MenuItem>
            ))}
          </Menu>

          {/* Leave Types */}
          <Button onClick={e => { setTypeAnchor(e.currentTarget); setProjAnchor(null); setStatusAnchor(null); }} endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 12 }} />} sx={btnSx}>
            <FiberManualRecordIcon sx={{ fontSize: 10, color: '#2563EB' }} />
            {activeLabel(leaveTypes, ALL_TYPES, 'Leave Types')}
          </Button>
          <Menu anchorEl={typeAnchor} open={Boolean(typeAnchor)} onClose={() => setTypeAnchor(null)} {...menuProps}>
            <MenuItem onClick={e => { e.stopPropagation(); onLeaveTypesChange([]); }} sx={{ borderRadius: '6px', fontSize: 13, gap: 1 }}>
              <Checkbox checked={isAllSelected(leaveTypes, ALL_TYPES)} size="small" sx={{ p: 0 }} /> All
            </MenuItem>
            {ALL_TYPES.map(lt => (
              <MenuItem key={lt} onClick={e => { e.stopPropagation(); toggleArr(leaveTypes, lt, onLeaveTypesChange); }} sx={{ borderRadius: '6px', fontSize: 13, gap: 1, background: leaveTypes.includes(lt) ? '#f0f7ff' : 'transparent' }}>
                <Checkbox checked={leaveTypes.includes(lt)} size="small" sx={{ p: 0 }} /> {lt}
              </MenuItem>
            ))}
          </Menu>
        </Box>

        {/* Right — refresh / clear / logout */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={onRefresh} disabled={loading} sx={iconBtnSx}>
                <CachedOutlinedIcon sx={{ fontSize: 18, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Clear filters">
            <IconButton onClick={onClear} sx={iconBtnSx}>
              <FilterAltOffOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Logout">
            <IconButton onClick={() => setShowLogout(true)} sx={iconBtnSx}>
              <LogoutIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Calendar popover */}
      <DateRangePicker
        anchorEl={datePickerAnchor}
        onClose={() => setDatePickerAnchor(null)}
        startDate={startDate}
        endDate={endDate}
        onApply={(s, e) => handleRangeChange(s, e)}
      />

      {/* Date validation error dialog */}
      <Dialog open={Boolean(dateError)} onClose={() => setDateError(null)} PaperProps={{ sx: { borderRadius: '16px', p: '8px', width: 300 } }}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, pt: 3 }}>
          <Box sx={{ width: 54, height: 54, borderRadius: '50%', background: '#fef2f2', border: '1.5px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            <ErrorOutlineIcon sx={{ fontSize: 26, color: '#dc2626' }} />
          </Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>Invalid date range</Typography>
          <Typography sx={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 1.55, mt: 0.5 }}>{dateError}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <Button onClick={() => setDateError(null)} fullWidth variant="contained"
            sx={{ borderRadius: '9px', background: '#1e2d5a', fontSize: 13, fontWeight: 600, textTransform: 'none', py: 1.25, '&:hover': { background: '#162347' } }}>
            Fix it
          </Button>
        </DialogActions>
      </Dialog>

      {/* Logout dialog */}
      <Dialog open={showLogout} onClose={() => setShowLogout(false)} PaperProps={{ sx: { borderRadius: '16px', p: '8px', width: 300 } }}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, pt: 3 }}>
          <Box sx={{ width: 54, height: 54, borderRadius: '50%', background: '#fff5f0', border: '1.5px solid #fcd9c8', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            <LogoutIcon sx={{ fontSize: 24, color: '#1e2d5a' }} />
          </Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>Sign out?</Typography>
          <Typography sx={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 1.55, mt: 0.5 }}>You'll need to sign back in to access the dashboard.</Typography>
        </DialogContent>
        <DialogActions sx={{ gap: 1.25, px: 3, pb: 3, pt: 1, '& > :not(style) ~ :not(style)': { ml: 0 } }}>
          <Button onClick={() => setShowLogout(false)} fullWidth variant="outlined" sx={{ borderRadius: '9px', borderColor: '#e5e7eb', color: '#374151', fontSize: 13, fontWeight: 600, textTransform: 'none', py: 1.25, '&:hover': { background: '#f3f4f6', borderColor: '#e5e7eb' } }}>Cancel</Button>
          <Button onClick={() => { setShowLogout(false); logout(); }} fullWidth variant="contained" sx={{ borderRadius: '9px', background: '#1e2d5a', fontSize: 13, fontWeight: 600, textTransform: 'none', py: 1.25, '&:hover': { background: '#162347' } }}>Yes, sign out</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}