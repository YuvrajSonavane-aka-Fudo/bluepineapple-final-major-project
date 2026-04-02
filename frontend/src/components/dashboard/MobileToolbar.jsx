import { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth,
         startOfWeek, addDays, isSameDay, isSameMonth,
         isWithinInterval, isBefore } from 'date-fns';
import { getWeekRange, getTodayRange, getMonthRange, shiftRange } from '../../utils/dateUtils';
import { useAuth } from '../../hooks/useAuth';
import {
  Box, Typography, IconButton,
  Checkbox, Dialog, DialogContent, DialogActions,
  Collapse, Switch, CircularProgress,
} from '@mui/material';
import { exportDashboardToExcel } from './ExportToExcel';
import ChevronLeftIcon           from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon          from '@mui/icons-material/ChevronRight';
import KeyboardArrowDownIcon     from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon       from '@mui/icons-material/KeyboardArrowUp';
import LogoutIcon                from '@mui/icons-material/Logout';
import CachedOutlinedIcon        from '@mui/icons-material/CachedOutlined';
import FilterAltOffOutlinedIcon  from '@mui/icons-material/FilterAltOffOutlined';
import CloseIcon                 from '@mui/icons-material/Close';
import TuneIcon                  from '@mui/icons-material/Tune';
import CalendarTodayIcon         from '@mui/icons-material/CalendarToday';

/* Mini Calendar with tappable month/year nav */
function MiniCalendar({ viewDate, onViewDateChange, tempStart, tempEnd, hoverDate, onDayClick, onDayHover }) {
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker,  setShowYearPicker]  = useState(false);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay  = startOfMonth(viewDate);
  const gridStart = startOfWeek(firstDay, { weekStartsOn: 1 });
  const days      = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  const getDayState = (day) => {
    const isStart  = tempStart && isSameDay(day, tempStart);
    const isEnd    = tempEnd   && isSameDay(day, tempEnd);
    let   inRange  = false;
    if (tempStart && tempEnd) {
      inRange = isWithinInterval(day, { start: tempStart, end: tempEnd });
    } else if (tempStart && hoverDate && !isBefore(hoverDate, tempStart)) {
      inRange = isWithinInterval(day, { start: tempStart, end: hoverDate });
    }
    const isOther = !isSameMonth(day, viewDate);
    return { isStart, isEnd, inRange, isOther };
  };

  /* Month picker overlay */
  if (showMonthPicker) {
    return (
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, px: 0.5 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1a1f2e' }}>Select Month</Typography>
          <Box component="button" onClick={() => setShowMonthPicker(false)}
            sx={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', p: 0.25, borderRadius: '4px' }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5 }}>
          {MONTHS.map((m, i) => (
            <Box key={m} component="button"
              onClick={() => { onViewDateChange(new Date(year, i, 1)); setShowMonthPicker(false); }}
              sx={{
                py: 1, px: 0.5, borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: i === month ? '#1e2d5a' : 'transparent',
                color: i === month ? '#fff' : '#374151',
                '&:hover': { background: i === month ? '#1e2d5a' : '#f0f2f5' },
              }}>{m}</Box>
          ))}
        </Box>
      </Box>
    );
  }

  /* Year picker overlay */
  if (showYearPicker) {
    return (
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, px: 0.5 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1a1f2e' }}>Select Year</Typography>
          <Box component="button" onClick={() => setShowYearPicker(false)}
            sx={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', p: 0.25, borderRadius: '4px' }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5, maxHeight: 200, overflowY: 'auto' }}>
          {years.map(y => (
            <Box key={y} component="button"
              onClick={() => { onViewDateChange(new Date(y, month, 1)); setShowYearPicker(false); }}
              sx={{
                py: 1, px: 0.5, borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: y === year ? '#1e2d5a' : 'transparent',
                color: y === year ? '#fff' : '#374151',
                '&:hover': { background: y === year ? '#1e2d5a' : '#f0f2f5' },
              }}>{y}</Box>
          ))}
        </Box>
      </Box>
    );
  }

  /* Normal calendar view */
  return (
    <Box sx={{ userSelect: 'none' }}>
      {/* Month / Year header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5, mb: 0.5 }}>
        <Box component="button" onClick={() => onViewDateChange(subMonths(viewDate, 1))}
          sx={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', p: 0.5, borderRadius: '6px', color: '#6b7280', '&:hover': { background: '#f0f2f5' } }}>
          <ChevronLeftIcon sx={{ fontSize: 18 }} />
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Box component="button" onClick={() => setShowMonthPicker(true)}
            sx={{
              background: 'none', border: '1px solid transparent', borderRadius: '6px',
              cursor: 'pointer', px: 1, py: 0.25,
              fontSize: 13, fontWeight: 700, color: '#1a1f2e',
              '&:hover': { background: '#f0f2f5', borderColor: '#e5e7eb' },
            }}>
            {MONTHS[month]}
          </Box>
          <Box component="button" onClick={() => setShowYearPicker(true)}
            sx={{
              background: 'none', border: '1px solid transparent', borderRadius: '6px',
              cursor: 'pointer', px: 1, py: 0.25,
              fontSize: 13, fontWeight: 700, color: '#1a1f2e',
              '&:hover': { background: '#f0f2f5', borderColor: '#e5e7eb' },
            }}>
            {year}
          </Box>
        </Box>

        <Box component="button" onClick={() => onViewDateChange(addMonths(viewDate, 1))}
          sx={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', p: 0.5, borderRadius: '6px', color: '#6b7280', '&:hover': { background: '#f0f2f5' } }}>
          <ChevronRightIcon sx={{ fontSize: 18 }} />
        </Box>
      </Box>

      {/* Weekday labels */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.25 }}>
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <Box key={i} sx={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#9aa0ad', py: 0.25 }}>{d}</Box>
        ))}
      </Box>

      {/* Days grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((day, i) => {
          const { isStart, isEnd, inRange, isOther } = getDayState(day);
          const isSelected = isStart || isEnd;
          const isToday    = isSameDay(day, new Date());

          const rangeBg = (() => {
            if (!inRange) return {};
            if (isStart && !isEnd)  return { left: '50%', right: 0 };
            if (isEnd   && !isStart) return { left: 0, right: '50%' };
            return { left: 0, right: 0 };
          })();

          return (
            <Box key={i}
              component="button"
              onClick={() => onDayClick(day)}
              onMouseEnter={() => onDayHover(day)}
              sx={{
                position: 'relative', height: 32, border: 'none',
                cursor: 'pointer', background: 'none', p: 0,
              }}
            >
              {inRange && (
                <Box sx={{
                  position: 'absolute', top: 2, bottom: 2,
                  ...rangeBg,
                  background: '#e8ecf5',
                  zIndex: 0,
                }} />
              )}
              <Box sx={{
                position: 'relative', zIndex: 1,
                width: 28, height: 28,
                margin: '2px auto',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isSelected ? '#1e2d5a' : 'transparent',
                border: isToday && !isSelected ? '1.5px solid #1e2d5a' : 'none',
                fontSize: 11,
                fontWeight: isSelected || isToday ? 700 : 400,
                color: isSelected ? '#fff'
                     : isOther   ? '#c8cdd6'
                     : '#1a1f2e',
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

/* Date Range Picker Dialog */
function DateRangePickerDialog({ open, onClose, startDate, endDate, onApply }) {
  const [tempStart, setTempStart] = useState(null);
  const [tempEnd,   setTempEnd]   = useState(null);
  const [selecting, setSelecting] = useState('start');
  const [hoverDate, setHoverDate] = useState(null);
  const [viewDate,  setViewDate]  = useState(new Date());

  const handleOpen = () => {
    setTempStart(startDate || null);
    setTempEnd(endDate || null);
    setSelecting('start');
    setHoverDate(null);
    setViewDate(startDate || new Date());
  };

  const handleDayClick = (day) => {
    if (selecting === 'start') {
      setTempStart(day);
      // Preserve end date UNLESS new start would be after it (invalid range)
      if (tempEnd && isBefore(tempEnd, day)) {
        setTempEnd(null);
      }
      setSelecting('end');
    } else {
      // Tapped a day before current start -> swap
      if (isBefore(day, tempStart)) {
        setTempEnd(tempStart);
        setTempStart(day);
      } else {
        // Normal: set end, preserve start
        setTempEnd(day);
      }
      setSelecting('start');
    }
  };

  const handleApply = () => {
    const s = tempStart;
    const e = tempEnd || tempStart;
    if (s) { onApply(s, e); onClose(); }
  };

  const presets = [
    { label: 'Today',      fn: () => { const r = getTodayRange();  setTempStart(r.start); setTempEnd(r.end);  setViewDate(r.start); setSelecting('start'); } },
    { label: 'This Week',  fn: () => { const r = getWeekRange();   setTempStart(r.start); setTempEnd(r.end);  setViewDate(r.start); setSelecting('start'); } },
    { label: 'This Month', fn: () => { const r = getMonthRange();  setTempStart(r.start); setTempEnd(r.end);  setViewDate(r.start); setSelecting('start'); } },
  ];

  const fmtLabel = (d) => d ? format(d, 'MMM d, yyyy') : '—';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionProps={{ onEntering: handleOpen }}
      PaperProps={{ sx: { borderRadius: '18px', width: '92vw', maxWidth: 360, m: 1 } }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Header */}
        <Box sx={{
          background: '#1e2d5a', px: 2, py: 1.5,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderRadius: '18px 18px 0 0',
        }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Select Date Range</Typography>
          <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.8)', p: 0.5 }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Start / End display */}
        <Box sx={{ display: 'flex', px: 2, py: 1.25, gap: 1, background: '#f8f9fb', borderBottom: '1px solid #f0f2f5' }}>
          {[
            { label: 'Start', val: tempStart, active: selecting === 'start', onClick: () => setSelecting('start') },
            { label: 'End',   val: tempEnd,   active: selecting === 'end',   onClick: () => { if (tempStart) setSelecting('end'); } },
          ].map(({ label, val, active, onClick }) => (
            <Box key={label} onClick={onClick} sx={{
              flex: 1, py: '8px', px: '10px', borderRadius: '9px', cursor: 'pointer',
              border: `1.5px solid ${active ? '#1e2d5a' : '#e5e7eb'}`,
              background: '#fff',
              boxShadow: active ? '0 0 0 2px rgba(30,45,90,0.1)' : 'none',
            }}>
              <Typography sx={{ fontSize: 9, fontWeight: 700, color: active ? '#1e2d5a' : '#9aa0ad', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: val ? '#1a1f2e' : '#c8cdd6', mt: 0.1 }}>
                {fmtLabel(val)}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Quick presets */}
        <Box sx={{ display: 'flex', gap: 0.75, px: 2, pt: 1.25, pb: 0.5 }}>
          {presets.map(({ label, fn }) => (
            <Box key={label} component="button" onClick={fn} sx={{
              flex: 1, py: '6px', px: '2px', borderRadius: '7px',
              border: '1px solid #e5e7eb', background: '#fff',
              fontSize: 11, fontWeight: 600, color: '#374151', cursor: 'pointer',
              whiteSpace: 'nowrap',
              '&:hover':  { background: '#f0f2f5', borderColor: '#1e2d5a', color: '#1e2d5a' },
              '&:active': { background: '#e8ecf5' },
            }}>{label}</Box>
          ))}
        </Box>

        {/* Hint */}
        <Typography sx={{ fontSize: 10, color: '#9aa0ad', textAlign: 'center', pb: 0.5, fontWeight: 500 }}>
          {selecting === 'start' ? 'Tap to set start date' : 'Tap to set end date'}
        </Typography>

        {/* Calendar */}
        <Box sx={{ px: 1.5, pb: 1 }}>
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
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2, pt: 0.5, gap: 1, '& > :not(style) ~ :not(style)': { ml: 0 } }}>
        <Box component="button" onClick={onClose} sx={{
          flex: 1, py: '10px', borderRadius: '9px',
          border: '1px solid #e5e7eb', background: '#fff',
          color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          '&:hover': { background: '#f9fafb' },
        }}>Cancel</Box>
        <Box component="button" onClick={handleApply} sx={{
          flex: 1, py: '10px', borderRadius: '9px', border: 'none',
          background: tempStart ? '#1e2d5a' : '#c0c7d6',
          color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: tempStart ? 'pointer' : 'default',
          '&:hover': tempStart ? { background: '#162347' } : {},
        }}>Apply Range</Box>
      </DialogActions>
    </Dialog>
  );
}

/* Main MobileToolbar */
export default function MobileToolbar({
  startDate, endDate, onRangeChange,
  projects, selectedProjectIds, onProjectsChange,
  leaveStatuses, onLeaveStatusesChange,
  leaveTypes, onLeaveTypesChange,
  onRefresh, onClear, loading,
  showAll, onShowAllChange,
  hideWeekends, onHideWeekendsChange,
  empData, projData, dateStrip, exportFilters,
}) {
  const { logout } = useAuth();
  const [drawerOpen,     setDrawerOpen]     = useState(false);
  const [openSection,    setOpenSection]    = useState(null);
  const [showLogout,     setShowLogout]     = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [exporting,      setExporting]      = useState(false);

  const handleExport = () => {
    setExporting(true);
    try {
      exportDashboardToExcel({ empData, projData, dateStrip, filters: exportFilters });
    } finally {
      setExporting(false);
    }
  };

  const ALL_STATUSES = ['Approved', 'Pending', 'Rejected', 'Cancelled'];
  const ALL_TYPES    = ['Paid', 'Unpaid', 'WFH', 'Half Day', 'COMP OFF', 'AU', 'Other'];

  const isSameD = (d1, d2) => d1?.toDateString?.() === d2?.toDateString?.();
  const activeFilter = (() => {
    if (isSameD(startDate, getTodayRange().start) && isSameD(endDate, getTodayRange().end)) return 'T';
    if (isSameD(startDate, getWeekRange().start)  && isSameD(endDate, getWeekRange().end))  return 'W';
    return null;
  })();

  const fmtDisplay = (d) => format(d instanceof Date ? d : new Date(d), 'd MMM');

  const toggleArr = (arr, val, setter, allValues) => {
    const next = arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
    setter(next.length === allValues.length ? [] : next);
  };
  const isAllSelected = (arr, allValues) => arr.length === 0 || arr.length === allValues.length;

  const activeCount = [
    selectedProjectIds.length > 0,
    leaveStatuses.length > 0,
    leaveTypes.length > 0,
    showAll,
    hideWeekends,
  ].filter(Boolean).length;

  const iconBtnSx = {
    width: 30, height: 30,
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '7px', color: 'rgba(255,255,255,0.85)',
    '&:hover': { background: 'rgba(255,255,255,0.18)' },
  };

  function FilterSection({ id, label, badge, children }) {
    const open = openSection === id;
    return (
      <Box sx={{ borderBottom: '1px solid #f0f2f5' }}>
        <Box onClick={() => setOpenSection(open ? null : id)} sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1.4, cursor: 'pointer',
          background: open ? '#f8f9fb' : '#fff', userSelect: 'none',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1a1f2e' }}>{label}</Typography>
            {badge > 0 && (
              <Box sx={{ background: '#1e2d5a', borderRadius: 99, px: '7px', py: '1px' }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{badge}</Typography>
              </Box>
            )}
          </Box>
          {open ? <KeyboardArrowUpIcon sx={{ fontSize: 18, color: '#9aa0ad' }} />
                : <KeyboardArrowDownIcon sx={{ fontSize: 18, color: '#9aa0ad' }} />}
        </Box>
        <Collapse in={open}>
          <Box sx={{ maxHeight: 200, overflowY: 'auto', px: 1.5, pb: 1, background: '#fafafa' }}>
            {children}
          </Box>
        </Collapse>
      </Box>
    );
  }

  function CheckItem({ label, checked, onClick }) {
    return (
      <Box onClick={onClick} sx={{
        display: 'flex', alignItems: 'center', gap: 0.75,
        py: 0.65, px: 0.5, borderRadius: '6px', cursor: 'pointer',
        '&:active': { background: '#f0f2f5' },
      }}>
        <Checkbox checked={!!checked} size="small"
          sx={{ p: 0, color: '#c8cdd6', '&.Mui-checked': { color: '#1e2d5a' } }} />
        <Typography sx={{ fontSize: 13, color: '#374151' }}>{label}</Typography>
      </Box>
    );
  }

  return (
    <>
      {/* ROW 1 — Logo | Refresh Clear Logout */}
      <Box sx={{
        height: 48, background: '#1e2d5a',
        display: 'flex', alignItems: 'center',
        px: 1.5, gap: 1, flexShrink: 0, zIndex: 10,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <Box sx={{
            width: 28, height: 28, background: 'rgba(255,255,255,0.15)',
            borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect x="3"  y="3"  width="8" height="8" rx="2" fill="white"/>
              <rect x="13" y="3"  width="8" height="8" rx="2" fill="white" opacity="0.5"/>
              <rect x="3"  y="13" width="8" height="8" rx="2" fill="white" opacity="0.5"/>
              <rect x="13" y="13" width="8" height="8" rx="2" fill="white" opacity="0.8"/>
            </svg>
          </Box>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: '-0.2px' }}>
            Leave Impact
          </Typography>
        </Box>
        <IconButton onClick={onRefresh} disabled={loading} sx={iconBtnSx}>
          <CachedOutlinedIcon sx={{ fontSize: 16, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </IconButton>
        <IconButton onClick={onClear} sx={iconBtnSx}>
          <FilterAltOffOutlinedIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton onClick={() => setShowLogout(true)} sx={iconBtnSx}>
          <LogoutIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Box>

      {/* ROW 2 : Date Range  | T W | Filters */}
      <Box sx={{
        height: 40, background: '#253870',
        display: 'flex', alignItems: 'center',
        px: '8px', gap: '6px', flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        boxSizing: 'border-box', overflow: 'hidden',
      }}>
        {/* Prev arrow */}
        <Box component="button"
          onClick={() => { const r = shiftRange(startDate, endDate, 'back'); onRangeChange(r.start, r.end); }}
          sx={{
            width: 26, height: 26, flexShrink: 0,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '6px', color: 'rgba(255,255,255,0.85)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0,
            '&:hover': { background: 'rgba(255,255,255,0.18)' },
            '&:active': { background: 'rgba(255,255,255,0.25)' },
          }}>
          <ChevronLeftIcon sx={{ fontSize: 16 }} />
        </Box>

        {/* Date range pill */}
        <Box component="button" onClick={() => setDatePickerOpen(true)}
          sx={{
            flex: 1, minWidth: 0, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '7px', px: '6px', boxSizing: 'border-box',
            cursor: 'pointer', overflow: 'hidden',
            '&:hover':  { background: 'rgba(255,255,255,0.18)' },
            '&:active': { background: 'rgba(255,255,255,0.25)' },
          }}>
          <CalendarTodayIcon sx={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
          <Typography sx={{
            color: '#fff', fontSize: 10, fontFamily: "'DM Mono', monospace",
            whiteSpace: 'nowrap', letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {fmtDisplay(startDate)} — {fmtDisplay(endDate)}
          </Typography>
        </Box>

        {/* Next arrow */}
        <Box component="button"
          onClick={() => { const r = shiftRange(startDate, endDate, 'forward'); onRangeChange(r.start, r.end); }}
          sx={{
            width: 26, height: 26, flexShrink: 0,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '6px', color: 'rgba(255,255,255,0.85)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0,
            '&:hover': { background: 'rgba(255,255,255,0.18)' },
            '&:active': { background: 'rgba(255,255,255,0.25)' },
          }}>
          <ChevronRightIcon sx={{ fontSize: 16 }} />
        </Box>

        {/* T W quick filters */}
        <Box sx={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', p: '2px', flexShrink: 0 }}>
          {[
            { label: 'T', fn: () => { const r = getTodayRange(); onRangeChange(r.start, r.end); } },
            { label: 'W', fn: () => { const r = getWeekRange();  onRangeChange(r.start, r.end); } },
          ].map(({ label, fn }) => (
            <Box key={label} component="button" onClick={fn} sx={{
              minWidth: 24, height: 22, px: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700,
              color:      activeFilter === label ? '#fff' : 'rgba(255,255,255,0.65)',
              background: activeFilter === label ? 'rgba(255,255,255,0.25)' : 'transparent',
              '&:hover':  { background: 'rgba(255,255,255,0.15)' },
              '&:active': { background: 'rgba(255,255,255,0.3)' },
            }}>{label}</Box>
          ))}
        </Box>

        {/* Filters button */}
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <Box component="button" onClick={() => setDrawerOpen(true)} sx={{
            height: 26, px: '8px', display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            background: activeCount > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '6px', color: '#fff',
            '&:hover': { background: 'rgba(255,255,255,0.2)' },
            '&:active': { background: 'rgba(255,255,255,0.3)' },
          }}>
            <TuneIcon sx={{ fontSize: 13 }} />
            Filters
          </Box>
          {activeCount > 0 && (
            <Box sx={{
              position: 'absolute', top: -4, right: -4,
              width: 14, height: 14, borderRadius: '50%',
              background: '#ef4444', border: '1.5px solid #253870',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <Typography sx={{ fontSize: 8, fontWeight: 700, color: '#fff' }}>{activeCount}</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* DATE RANGE PICKER DIALOG */}
      <DateRangePickerDialog
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        startDate={startDate}
        endDate={endDate}
        onApply={(s, e) => onRangeChange(s, e)}
      />

      {/* LEFT SIDE DRAWER — Backdrop */}
      <Box onClick={() => setDrawerOpen(false)} sx={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(0,0,0,0.45)',
        opacity:    drawerOpen ? 1 : 0,
        pointerEvents: drawerOpen ? 'auto' : 'none',
        transition: 'opacity 0.25s ease',
      }} />

      {/* Drawer */}
      <Box sx={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: 280, zIndex: 1300, background: '#fff',
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1.4, background: '#1e2d5a', flexShrink: 0,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Filters</Typography>
            {activeCount > 0 && (
              <Box sx={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, px: '7px', py: '1px' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{activeCount} active</Typography>
              </Box>
            )}
          </Box>
          <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: 'rgba(255,255,255,0.8)', p: 0.5 }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <FilterSection id="project" label="Project" badge={selectedProjectIds.length}>
            <CheckItem label="All Projects" checked={selectedProjectIds.length === 0} onClick={() => onProjectsChange([])} />
            {projects.map(p => (
              <CheckItem key={p.project_id} label={p.project_name}
                checked={selectedProjectIds.includes(p.project_id)}
                onClick={() => toggleArr(selectedProjectIds, p.project_id, onProjectsChange, projects.map(x => x.project_id))} />
            ))}
          </FilterSection>

          <FilterSection id="status" label="Leave Status" badge={leaveStatuses.length}>
            <CheckItem label="All" checked={isAllSelected(leaveStatuses, ALL_STATUSES)} onClick={() => onLeaveStatusesChange([])} />
            {ALL_STATUSES.map(st => (
              <CheckItem key={st} label={st} checked={leaveStatuses.includes(st)}
                onClick={() => toggleArr(leaveStatuses, st, onLeaveStatusesChange, ALL_STATUSES)} />
            ))}
          </FilterSection>

          <FilterSection id="type" label="Leave Type" badge={leaveTypes.length}>
            <CheckItem label="All" checked={isAllSelected(leaveTypes, ALL_TYPES)} onClick={() => onLeaveTypesChange([])} />
            {ALL_TYPES.map(lt => (
              <CheckItem key={lt} label={lt} checked={leaveTypes.includes(lt)}
                onClick={() => toggleArr(leaveTypes, lt, onLeaveTypesChange, ALL_TYPES)} />
            ))}
          </FilterSection>

          {/* Display toggles */}
          <FilterSection id="display" label="Display" badge={[showAll, hideWeekends].filter(Boolean).length}>
            {[
              { label: 'All Employees', val: showAll,      fn: () => onShowAllChange(!showAll) },
              { label: 'Hide Weekends', val: hideWeekends, fn: () => onHideWeekendsChange(!hideWeekends) },
            ].map(({ label, val, fn }) => (
              <Box key={label} onClick={fn} sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                py: 0.65, px: 0.5, borderRadius: '6px', cursor: 'pointer',
                '&:active': { background: '#f0f2f5' },
              }}>
                <Typography sx={{ fontSize: 13, color: '#374151' }}>{label}</Typography>
                <Switch
                  checked={!!val}
                  onChange={fn}
                  size="small"
                  onClick={e => e.stopPropagation()}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#1e2d5a' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#1e2d5a' },
                    '& .MuiSwitch-track': { backgroundColor: '#d1d5db' },
                  }}
                />
              </Box>
            ))}
          </FilterSection>

          {/* Export */}
          <FilterSection id="export" label="Export">
            <Box
              component="button"
              onClick={handleExport}
              disabled={exporting}
              sx={{
                width: '100%', py: '10px', borderRadius: '8px', border: 'none',
                background: exporting ? '#93c5fd' : '#2563EB',
                color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: exporting ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                mt: 0.5,
                '&:hover': { background: exporting ? '#93c5fd' : '#1d4ed8' },
              }}
            >
              {exporting
                ? <CircularProgress size={13} sx={{ color: '#fff' }} />
                : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                )
              }
              {exporting ? 'Exporting…' : 'Export to Excel'}
            </Box>
          </FilterSection>
        </Box>

        <Box sx={{ px: 2, py: 2, borderTop: '1px solid #f0f2f5', flexShrink: 0, display: 'flex', gap: 1 }}>
          <Box component="button"
            onClick={() => { onClear(); setDrawerOpen(false); setOpenSection(null); }}
            sx={{
              flex: 1, py: '10px', borderRadius: '8px', border: '1px solid #e5e7eb',
              background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              '&:hover': { background: '#f9fafb' }, '&:active': { background: '#f3f4f6' },
            }}>Clear All</Box>
          <Box component="button" onClick={() => setDrawerOpen(false)}
            sx={{
              flex: 1, py: '10px', borderRadius: '8px', border: 'none',
              background: '#1e2d5a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              '&:hover': { background: '#162347' }, '&:active': { background: '#111d3d' },
            }}>Apply</Box>
        </Box>
      </Box>

      {/* Logout dialog */}
      <Dialog open={showLogout} onClose={() => setShowLogout(false)}
        PaperProps={{ sx: { borderRadius: '16px', p: '8px', width: 300 } }}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, pt: 3 }}>
          <Box sx={{ width: 54, height: 54, borderRadius: '50%', background: '#fff5f0', border: '1.5px solid #fcd9c8', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            <LogoutIcon sx={{ fontSize: 24, color: '#1e2d5a' }} />
          </Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Sign out?</Typography>
          <Typography sx={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 1.55, mt: 0.5 }}>
            You'll need to sign back in to access the dashboard.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ gap: 1.25, px: 3, pb: 3, pt: 1, '& > :not(style) ~ :not(style)': { ml: 0 } }}>
          <Box component="button" onClick={() => setShowLogout(false)}
            sx={{ flex: 1, py: '10px', borderRadius: '9px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', '&:hover': { background: '#f3f4f6' } }}>
            Cancel
          </Box>
          <Box component="button" onClick={() => { setShowLogout(false); logout(); }}
            sx={{ flex: 1, py: '10px', borderRadius: '9px', border: 'none', background: '#1e2d5a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', '&:hover': { background: '#162347' } }}>
            Yes, sign out
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
}