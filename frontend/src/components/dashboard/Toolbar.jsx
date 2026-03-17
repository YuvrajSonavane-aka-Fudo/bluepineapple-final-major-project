// src/components/dashboard/Toolbar.jsx
import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { fmt, getWeekRange, getMonthRange, getTodayRange, getYearRange, shiftRange } from '../../utils/dateUtils';
import { useAuth } from '../../hooks/useAuth';
import {
  Box, Typography, Button, IconButton, Menu, MenuItem,
  Checkbox, Tooltip, Dialog, DialogContent, DialogActions,
} from '@mui/material';
import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined';
import CachedOutlinedIcon from '@mui/icons-material/CachedOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LogoutIcon from '@mui/icons-material/Logout';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

export default function Toolbar({
  startDate, endDate, onRangeChange,
  projects, selectedProjectIds, onProjectsChange,
  leaveStatuses, onLeaveStatusesChange,
  leaveTypes, onLeaveTypesChange,
  onRefresh, onClear, loading,
}) {
  const { logout } = useAuth();
  const [projAnchor,   setProjAnchor]   = useState(null);
  const [statusAnchor, setStatusAnchor] = useState(null);
  const [typeAnchor,   setTypeAnchor]   = useState(null);
  const [showLogout,   setShowLogout]   = useState(false);
  const startInputRef = useRef(null);
  const endInputRef   = useRef(null);

  const ALL_STATUSES = ['Approved', 'Pending', 'Rejected'];
  const ALL_TYPES    = ['Paid', 'Unpaid', 'WFH', 'Half Day'];

  const getActiveFilter = () => {
    const isSameDay = (d1, d2) => d1.toDateString() === d2.toDateString();
    if (isSameDay(startDate, getTodayRange().start) && isSameDay(endDate, getTodayRange().end)) return 'T';
    if (isSameDay(startDate, getWeekRange().start)  && isSameDay(endDate, getWeekRange().end))  return 'W';
    if (isSameDay(startDate, getMonthRange().start) && isSameDay(endDate, getMonthRange().end)) return 'M';
    if (isSameDay(startDate, getYearRange().start)  && isSameDay(endDate, getYearRange().end))  return 'Y';
    return null;
  };

  const activeFilter = getActiveFilter();
  const fmtDisplay = (d) => format(d instanceof Date ? d : new Date(d), 'MMM dd, yyyy');
  const toggleArr = (arr, val, setter) => setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  const activeLabel = (arr, allLabel) => arr.length === 0 ? allLabel : arr.length === 1 ? arr[0] : `${arr[0]} +${arr.length - 1}`;

  const QUICK = [
    { label: 'T', tooltip: 'Today',      fn: () => { const r = getTodayRange(); onRangeChange(r.start, r.end); } },
    { label: 'W', tooltip: 'This Week',  fn: () => { const r = getWeekRange();  onRangeChange(r.start, r.end); } },
    { label: 'M', tooltip: 'This Month', fn: () => { const r = getMonthRange(); onRangeChange(r.start, r.end); } },
    { label: 'Y', tooltip: 'This Year',  fn: () => { const r = getYearRange();  onRangeChange(r.start, r.end); } },
  ];

  const btnSx = {
    display: 'flex', alignItems: 'center', gap: '6px',
    px: 1.25, py: 0.75,
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
    PaperProps: {
      sx: { borderRadius: '10px', border: '1px solid #e8eaed', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', mt: 0.75, minWidth: 180 }
    },
    MenuListProps: { sx: { p: 0.75 } },
  };

  return (
    <>
      <Box sx={{ height: 52, background: '#1e2d5a', display: 'flex', alignItems: 'center', px: 2, gap: 1.5, flexShrink: 0, position: 'relative', zIndex: 10 }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
          <Box sx={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3"  y="3"  width="8" height="8" rx="2" fill="white"/>
              <rect x="13" y="3"  width="8" height="8" rx="2" fill="white" opacity="0.5"/>
              <rect x="3"  y="13" width="8" height="8" rx="2" fill="white" opacity="0.5"/>
              <rect x="13" y="13" width="8" height="8" rx="2" fill="white" opacity="0.8"/>
            </svg>
          </Box>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '-0.2px' }}>Leave Impact Dashboard</Typography>
        </Box>

        {/* Center */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline' }}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filters:
          </Typography>

          <IconButton onClick={() => { const r = shiftRange(startDate, endDate, 'back'); onRangeChange(r.start, r.end); }} sx={{ ...iconBtnSx, width: 26, height: 26 }}>
            <ChevronLeftIcon sx={{ fontSize: 14 }} />
          </IconButton>

          {/* Date range */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '7px', px: 1, py: 0.4 }}>
            {[
              { ref: startInputRef, val: fmt(startDate), display: fmtDisplay(startDate), onChange: (v) => { const d = new Date(v); if (!isNaN(d) && d <= endDate) onRangeChange(d, endDate); } },
              { ref: endInputRef,   val: fmt(endDate),   display: fmtDisplay(endDate),   onChange: (v) => { const d = new Date(v); if (!isNaN(d) && d >= startDate) onRangeChange(startDate, d); } },
            ].map((item, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {i > 0 && <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, pb: '2px' }}>—</Typography>}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ color: '#fff', fontSize: 12, fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap' }}>{item.display}</Typography>
                  <IconButton size="small" sx={{ p: 0, color: 'rgba(255,255,255,0.7)' }} onClick={() => item.ref.current?.showPicker?.() || item.ref.current?.click()}>
                    <CalendarTodayIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                  <input ref={item.ref} type="date" value={item.val} onChange={e => item.onChange(e.target.value)} style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />
                </Box>
              </Box>
            ))}
          </Box>

          <IconButton onClick={() => { const r = shiftRange(startDate, endDate, 'forward'); onRangeChange(r.start, r.end); }} sx={{ ...iconBtnSx, width: 26, height: 26 }}>
            <ChevronRightIcon sx={{ fontSize: 14 }} />
          </IconButton>

          {/* Quick filters */}
          <Box sx={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '7px', p: '2px' }}>
            {QUICK.map(({ label, tooltip, fn }) => (
              <Tooltip key={label} title={tooltip} placement="bottom">
                <Button onClick={fn} sx={{ minWidth: 0, px: 1.25, py: 0.5, borderRadius: '5px', fontSize: 11, fontWeight: 700, color: activeFilter === label ? '#fff' : 'rgba(255,255,255,0.7)', background: activeFilter === label ? 'rgba(255,255,255,0.25)' : 'transparent', '&:hover': { background: 'rgba(255,255,255,0.15)' } }}>
                  {label}
                </Button>
              </Tooltip>
            ))}
          </Box>

          <Box sx={{ height: 20, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />

          {/* Projects */}
          <Button onClick={e => { setProjAnchor(e.currentTarget); setStatusAnchor(null); setTypeAnchor(null); }} endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 12 }} />} sx={btnSx}>
            <Box component="span" sx={{ display: 'inline-flex', width: 15, height: 15, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>P</Box>
            {selectedProjectIds.length === 0 ? `All Projects (${projects.length})` : `${selectedProjectIds.length} Projects`}
          </Button>
          <Menu anchorEl={projAnchor} open={Boolean(projAnchor)} onClose={() => setProjAnchor(null)} {...menuProps}
            PaperProps={{ ...menuProps.PaperProps, sx: { ...menuProps.PaperProps.sx, maxHeight: 260, overflowY: 'auto', maxWidth: 320 } }}>
            <MenuItem onClick={e => { e.stopPropagation(); onProjectsChange([]); }} sx={{ borderRadius: '6px', fontSize: 13, gap: 1 }}>
              <Checkbox checked={selectedProjectIds.length === 0} size="small" sx={{ p: 0, accentColor: '#3b82f6' }} /> All Projects
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
            {activeLabel(leaveStatuses, 'Status: Approved')}
          </Button>
          <Menu anchorEl={statusAnchor} open={Boolean(statusAnchor)} onClose={() => setStatusAnchor(null)} {...menuProps}>
            {ALL_STATUSES.map(st => (
              <MenuItem key={st} onClick={e => { e.stopPropagation(); toggleArr(leaveStatuses, st, onLeaveStatusesChange); }} sx={{ borderRadius: '6px', fontSize: 13, gap: 1, background: leaveStatuses.includes(st) ? '#f0f7ff' : 'transparent' }}>
                <Checkbox checked={leaveStatuses.includes(st)} size="small" sx={{ p: 0 }} /> {st}
              </MenuItem>
            ))}
          </Menu>

          {/* Leave Types */}
          <Button onClick={e => { setTypeAnchor(e.currentTarget); setProjAnchor(null); setStatusAnchor(null); }} endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 12 }} />} sx={btnSx}>
            <FiberManualRecordIcon sx={{ fontSize: 10, color: '#2563EB' }} />
            {activeLabel(leaveTypes, 'Leave Types')}
          </Button>
          <Menu anchorEl={typeAnchor} open={Boolean(typeAnchor)} onClose={() => setTypeAnchor(null)} {...menuProps}>
            {ALL_TYPES.map(lt => (
              <MenuItem key={lt} onClick={e => { e.stopPropagation(); toggleArr(leaveTypes, lt, onLeaveTypesChange); }} sx={{ borderRadius: '6px', fontSize: 13, gap: 1, background: leaveTypes.includes(lt) ? '#f0f7ff' : 'transparent' }}>
                <Checkbox checked={leaveTypes.includes(lt)} size="small" sx={{ p: 0 }} /> {lt}
              </MenuItem>
            ))}
          </Menu>
        </Box>

        {/* Right */}
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
