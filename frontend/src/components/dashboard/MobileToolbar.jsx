// src/components/dashboard/MobileToolbar.jsx
import { useState } from 'react';
import { format } from 'date-fns';
import { fmt, getWeekRange, getTodayRange, shiftRange } from '../../utils/dateUtils';
import { useAuth } from '../../hooks/useAuth';
import {
  Box, Typography, IconButton,
  Checkbox, Dialog, DialogContent, DialogActions, Button,
  Collapse,
} from '@mui/material';
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ChevronLeftIcon          from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon         from '@mui/icons-material/ChevronRight';
import KeyboardArrowDownIcon    from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon      from '@mui/icons-material/KeyboardArrowUp';
import LogoutIcon               from '@mui/icons-material/Logout';
import CachedOutlinedIcon       from '@mui/icons-material/CachedOutlined';
import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined';
import CloseIcon                from '@mui/icons-material/Close';
import TuneIcon                 from '@mui/icons-material/Tune';
import CalendarTodayIcon        from '@mui/icons-material/CalendarToday';
import ErrorOutlineIcon         from '@mui/icons-material/ErrorOutline';

// ── Validation — same as Toolbar.jsx ─────────────────────────────────────
function validateRange(start, end) {
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()))
    return 'Please enter valid dates for both start and end.';
  if (end < start)
    return 'End date must be on or after the start date.';
  return null;
}

export default function MobileToolbar({
  startDate, endDate, onRangeChange,
  projects, selectedProjectIds, onProjectsChange,
  leaveStatuses, onLeaveStatusesChange,
  leaveTypes, onLeaveTypesChange,
  onRefresh, onClear, loading,
}) {
  const { logout } = useAuth();
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [openSection,  setOpenSection]  = useState(null);
  const [showLogout,   setShowLogout]   = useState(false);
  const [dateError,    setDateError]    = useState(null);

  // Two-step picker: start first, then end
  const [startOpen,    setStartOpen]    = useState(false);
  const [endOpen,      setEndOpen]      = useState(false);
  const [pendingStart, setPendingStart] = useState(null);

  const ALL_STATUSES = ['Approved', 'Pending', 'Rejected'];
  const ALL_TYPES    = ['Paid', 'Unpaid', 'WFH', 'Half Day'];

  const isSameDay = (d1, d2) => d1?.toDateString?.() === d2?.toDateString?.();
  const activeFilter = (() => {
    if (isSameDay(startDate, getTodayRange().start) && isSameDay(endDate, getTodayRange().end)) return 'T';
    if (isSameDay(startDate, getWeekRange().start)  && isSameDay(endDate, getWeekRange().end))  return 'W';
    return null;
  })();

  // Short format — fits pill cleanly on any screen width
  const fmtDisplay = (d) => format(d instanceof Date ? d : new Date(d), 'MMM d');

  const toggleArr = (arr, val, setter, allValues) => {
    const next = arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
    setter(next.length === allValues.length ? [] : next);
  };
  const isAllSelected = (arr, allValues) => arr.length === 0 || arr.length === allValues.length;

  const activeCount = [
    selectedProjectIds.length > 0,
    leaveStatuses.length > 0,
    leaveTypes.length > 0,
  ].filter(Boolean).length;

  // ── Safe range change ─────────────────────────────────────────────────
  const handleRangeChange = (newStart, newEnd) => {
    const err = validateRange(newStart, newEnd);
    if (err) { setDateError(err); return; }
    onRangeChange(newStart, newEnd);
  };

  // Step 1 — user picks start date → store it → open end picker
  const handleStartAccept = (val) => {
    if (!val || isNaN(val.getTime())) return;
    setPendingStart(val);
    // Small delay so start picker fully closes before end opens
    setTimeout(() => setEndOpen(true), 100);
  };

  // Step 2 — user picks end date → validate and apply
  const handleEndAccept = (val) => {
    if (!val || isNaN(val.getTime())) return;
    const start = pendingStart || startDate;
    setPendingStart(null);
    handleRangeChange(start, val);
  };

  const handleStartClose = () => {
    setStartOpen(false);
    setPendingStart(null);
  };

  const handleEndClose = () => {
    setEndOpen(false);
    setPendingStart(null);
  };

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
        <Box onClick={() => setOpenSection(open ? null : id)}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.4, cursor: 'pointer', background: open ? '#f8f9fb' : '#fff', userSelect: 'none' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1a1f2e' }}>{label}</Typography>
            {badge > 0 && (
              <Box sx={{ background: '#1e2d5a', borderRadius: 99, px: '7px', py: '1px' }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{badge}</Typography>
              </Box>
            )}
          </Box>
          {open ? <KeyboardArrowUpIcon sx={{ fontSize: 18, color: '#9aa0ad' }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 18, color: '#9aa0ad' }} />}
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
      <Box onClick={onClick} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.65, px: 0.5, borderRadius: '6px', cursor: 'pointer', '&:active': { background: '#f0f2f5' } }}>
        <Checkbox checked={!!checked} size="small" sx={{ p: 0, color: '#c8cdd6', '&.Mui-checked': { color: '#1e2d5a' } }} />
        <Typography sx={{ fontSize: 13, color: '#374151' }}>{label}</Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <>
        {/* ── ROW 1: Logo | Refresh Clear Logout ── */}
        <Box sx={{ height: 48, background: '#1e2d5a', display: 'flex', alignItems: 'center', px: 1.5, gap: 1, flexShrink: 0, zIndex: 10 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <Box sx={{ width: 28, height: 28, background: 'rgba(255,255,255,0.15)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <rect x="3"  y="3"  width="8" height="8" rx="2" fill="white"/>
                <rect x="13" y="3"  width="8" height="8" rx="2" fill="white" opacity="0.5"/>
                <rect x="3"  y="13" width="8" height="8" rx="2" fill="white" opacity="0.5"/>
                <rect x="13" y="13" width="8" height="8" rx="2" fill="white" opacity="0.8"/>
              </svg>
            </Box>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: '-0.2px' }}>Leave Impact</Typography>
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

        {/* ── ROW 2: ← [📅 Mar 23 — Mar 29] → | T W | Filters ── */}
        <Box sx={{ height: 40, background: '#253870', display: 'flex', alignItems: 'center', px: '8px', gap: '6px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', boxSizing: 'border-box' }}>

          {/* ← prev */}
          <Box component="button"
            onClick={() => { const r = shiftRange(startDate, endDate, 'back'); handleRangeChange(r.start, r.end); }}
            sx={{ width: 26, height: 26, flexShrink: 0, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0, '&:active': { background: 'rgba(255,255,255,0.25)' } }}>
            <ChevronLeftIcon sx={{ fontSize: 16 }} />
          </Box>

          {/* Date pill — single tap opens start picker */}
          <Box onClick={() => setStartOpen(true)}
            sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '7px', px: '8px', height: 26, cursor: 'pointer', '&:active': { background: 'rgba(255,255,255,0.18)' } }}>
            <CalendarTodayIcon sx={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
            <Typography sx={{ color: '#fff', fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 500, whiteSpace: 'nowrap', lineHeight: 1 }}>
              {fmtDisplay(startDate)} — {fmtDisplay(endDate)}
            </Typography>
          </Box>

          {/* → next */}
          <Box component="button"
            onClick={() => { const r = shiftRange(startDate, endDate, 'forward'); handleRangeChange(r.start, r.end); }}
            sx={{ width: 26, height: 26, flexShrink: 0, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0, '&:active': { background: 'rgba(255,255,255,0.25)' } }}>
            <ChevronRightIcon sx={{ fontSize: 16 }} />
          </Box>

          {/* T W */}
          <Box sx={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', p: '2px', flexShrink: 0 }}>
            {[
              { label: 'T', fn: () => { const r = getTodayRange(); handleRangeChange(r.start, r.end); } },
              { label: 'W', fn: () => { const r = getWeekRange();  handleRangeChange(r.start, r.end); } },
            ].map(({ label, fn }) => (
              <Box key={label} component="button" onClick={fn}
                sx={{ minWidth: 24, height: 22, px: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: activeFilter === label ? '#fff' : 'rgba(255,255,255,0.65)', background: activeFilter === label ? 'rgba(255,255,255,0.25)' : 'transparent', '&:active': { background: 'rgba(255,255,255,0.3)' } }}>
                {label}
              </Box>
            ))}
          </Box>

          {/* Filters */}
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Box component="button" onClick={() => setDrawerOpen(true)}
              sx={{ height: 26, px: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: activeCount > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', '&:active': { background: 'rgba(255,255,255,0.3)' } }}>
              <TuneIcon sx={{ fontSize: 13 }} />
              Filters
            </Box>
            {activeCount > 0 && (
              <Box sx={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#ef4444', border: '1.5px solid #253870', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <Typography sx={{ fontSize: 8, fontWeight: 700, color: '#fff' }}>{activeCount}</Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* ── MobileDatePicker: Start ── */}
        <MobileDatePicker
          open={startOpen}
          onClose={handleStartClose}
          onAccept={handleStartAccept}
          value={startDate}
          label="Start date"
          slotProps={{
            textField: { sx: { display: 'none' } },
            toolbar: { toolbarTitle: 'Select start date' },
            actionBar: { actions: ['cancel', 'accept'] },
            dialog: { sx: { '& .MuiPickersToolbar-title': { fontSize: 14 } } },
          }}
        />

        {/* ── MobileDatePicker: End ── */}
        <MobileDatePicker
          open={endOpen}
          onClose={handleEndClose}
          onAccept={handleEndAccept}
          value={endDate}
          minDate={pendingStart || startDate}
          label="End date"
          slotProps={{
            textField: { sx: { display: 'none' } },
            toolbar: { toolbarTitle: 'Select end date' },
            actionBar: { actions: ['cancel', 'accept'] },
          }}
        />

        {/* ── Left Drawer ── */}
        <Box onClick={() => setDrawerOpen(false)} sx={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.45)', opacity: drawerOpen ? 1 : 0, pointerEvents: drawerOpen ? 'auto' : 'none', transition: 'opacity 0.25s ease' }} />

        <Box sx={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 280, zIndex: 1300, background: '#fff', boxShadow: '4px 0 24px rgba(0,0,0,0.18)', transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.4, background: '#1e2d5a', flexShrink: 0 }}>
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
                <CheckItem key={p.project_id} label={p.project_name} checked={selectedProjectIds.includes(p.project_id)}
                  onClick={() => toggleArr(selectedProjectIds, p.project_id, onProjectsChange, projects.map(x => x.project_id))} />
              ))}
            </FilterSection>
            <FilterSection id="status" label="Leave Status" badge={leaveStatuses.length}>
              <CheckItem label="All Statuses" checked={isAllSelected(leaveStatuses, ALL_STATUSES)} onClick={() => onLeaveStatusesChange([])} />
              {ALL_STATUSES.map(st => (
                <CheckItem key={st} label={st} checked={leaveStatuses.includes(st)}
                  onClick={() => toggleArr(leaveStatuses, st, onLeaveStatusesChange, ALL_STATUSES)} />
              ))}
            </FilterSection>
            <FilterSection id="type" label="Leave Type" badge={leaveTypes.length}>
              <CheckItem label="All Types" checked={isAllSelected(leaveTypes, ALL_TYPES)} onClick={() => onLeaveTypesChange([])} />
              {ALL_TYPES.map(lt => (
                <CheckItem key={lt} label={lt} checked={leaveTypes.includes(lt)}
                  onClick={() => toggleArr(leaveTypes, lt, onLeaveTypesChange, ALL_TYPES)} />
              ))}
            </FilterSection>
          </Box>

          <Box sx={{ px: 2, py: 2, borderTop: '1px solid #f0f2f5', flexShrink: 0, display: 'flex', gap: 1 }}>
            <Box component="button" onClick={() => { onClear(); setDrawerOpen(false); setOpenSection(null); }}
              sx={{ flex: 1, py: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', '&:active': { background: '#f3f4f6' } }}>
              Clear All
            </Box>
            <Box component="button" onClick={() => setDrawerOpen(false)}
              sx={{ flex: 1, py: '10px', borderRadius: '8px', border: 'none', background: '#1e2d5a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', '&:active': { background: '#111d3d' } }}>
              Apply
            </Box>
          </Box>
        </Box>

        {/* ── Date error dialog — identical to Toolbar.jsx ── */}
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

        {/* ── Logout dialog ── */}
        <Dialog open={showLogout} onClose={() => setShowLogout(false)} PaperProps={{ sx: { borderRadius: '16px', p: '8px', width: 300 } }}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, pt: 3 }}>
            <Box sx={{ width: 54, height: 54, borderRadius: '50%', background: '#fff5f0', border: '1.5px solid #fcd9c8', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
              <LogoutIcon sx={{ fontSize: 24, color: '#1e2d5a' }} />
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Sign out?</Typography>
            <Typography sx={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 1.55, mt: 0.5 }}>You'll need to sign back in to access the dashboard.</Typography>
          </DialogContent>
          <DialogActions sx={{ gap: 1.25, px: 3, pb: 3, pt: 1, '& > :not(style) ~ :not(style)': { ml: 0 } }}>
            <Box component="button" onClick={() => setShowLogout(false)}
              sx={{ flex: 1, py: '10px', borderRadius: '9px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </Box>
            <Box component="button" onClick={() => { setShowLogout(false); logout(); }}
              sx={{ flex: 1, py: '10px', borderRadius: '9px', border: 'none', background: '#1e2d5a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Yes, sign out
            </Box>
          </DialogActions>
        </Dialog>
      </>
    </LocalizationProvider>
  );
}