import { useState } from 'react';
import { parseISO, isToday, format } from 'date-fns';
import { Box, Typography, InputBase, Collapse, Chip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const LEAVE_COLORS = { Paid: '#2563eb', Unpaid: '#93c5fd', WFH: '#59be68', 'Half Day': '#0891b2' };
const RISK_COLOR = { HIGH: '#dc2626', MEDIUM: '#d97706', LOW: '#16a34a' };
const RISK_BG = { HIGH: '#fef2f2', MEDIUM: '#fffbeb', LOW: '#f0fdf4' };

function LeaveTypeDot({ type }) {
  return (
    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: LEAVE_COLORS[type] || '#9aa0ad', flexShrink: 0 }} />
  );
}

function EmployeeCard({ emp, dateStrip, onCellClick }) {
  const [expanded, setExpanded] = useState(false);
  const leaveDays = dateStrip.filter(d => emp.cells?.[d.date] !== null && emp.cells?.[d.date] !== undefined);
  const leaveCount = Object.values(emp.cells || {}).filter(c => c !== null).length;

  const today = dateStrip.find(d => isToday(parseISO(d.date)));
  const todayCell = today ? emp.cells?.[today.date] : null;

  return (
    <Box sx={{ background: '#fff', borderRadius: '10px', border: '1px solid #e8eaed', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      {/* Card header row */}
      <Box
        onClick={() => setExpanded(v => !v)}
        sx={{ display: 'flex', alignItems: 'center', px: 1.5, py: 1.25, gap: 1, cursor: 'pointer', '&:active': { background: '#f8f9fb' } }}
      >
        {/* Avatar */}
        <Box sx={{
          width: 34, height: 34, borderRadius: '50%', background: '#eef2ff', border: '1.5px solid #c7d2fe',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#4338ca' }}>
            {emp.full_name?.charAt(0) || '?'}
          </Typography>
        </Box>

        {/* Name + ID */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1a1f2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {emp.full_name}
          </Typography>
          <Typography sx={{ fontSize: 10, color: '#9aa0ad', fontFamily: "'DM Mono', monospace" }}>
            #{emp.user_id?.toString().padStart(4, '0')}
          </Typography>
        </Box>

        {/* Leave count badge */}
        <Box sx={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 99, px: 1, py: '2px', flexShrink: 0 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#4338ca', fontFamily: "'DM Mono', monospace" }}>
            {leaveCount.toFixed(1)}
          </Typography>
        </Box>

        {/* Today status pill */}
        {todayCell && (
          <Chip
            label={todayCell.leave_type || 'Leave'}
            size="small"
            sx={{
              height: 20, fontSize: 10, fontWeight: 700,
              background: LEAVE_COLORS[todayCell.leave_type] || '#9aa0ad',
              color: '#fff', borderRadius: '4px',
              '& .MuiChip-label': { px: '6px' },
              flexShrink: 0,
            }}
          />
        )}

        {/* Expand toggle */}
        {leaveDays.length > 0 && (
          expanded ? <KeyboardArrowUpIcon sx={{ fontSize: 16, color: '#9aa0ad' }} /> : <KeyboardArrowDownIcon sx={{ fontSize: 16, color: '#9aa0ad' }} />
        )}
      </Box>

      {/* Expanded leave days */}
      <Collapse in={expanded && leaveDays.length > 0}>
        <Box sx={{ px: 1.5, pb: 1.25, pt: 0, borderTop: '1px solid #f0f2f5' }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#b0b6c3', letterSpacing: '0.5px', textTransform: 'uppercase', mt: 1, mb: 0.75 }}>
            Leave Days
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {leaveDays.map(d => {
              const cell = emp.cells[d.date];
              if (!cell) return null;
              const dateObj = parseISO(d.date);
              return (
                <Box
                  key={d.date}
                  onClick={() => onCellClick(emp, d.date, { left: window.innerWidth / 2, bottom: 200, top: 100, width: 0 })}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    px: 1, py: 0.75,
                    background: '#f8f9fb', border: '1px solid #eef0f3', borderRadius: '6px',
                    cursor: 'pointer', '&:active': { background: '#f0f2f5' },
                  }}
                >
                  <LeaveTypeDot type={cell.leave_type} />
                  <Typography sx={{ fontSize: 12, color: '#5a6272', fontFamily: "'DM Mono', monospace", flexShrink: 0, minWidth: 80 }}>
                    {format(dateObj, 'EEE, MMM d')}
                    {isToday(dateObj) && <span style={{ color: '#994545', fontWeight: 700 }}> ·Today</span>}
                  </Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1a1f2e', flex: 1 }}>
                    {cell.leave_type}
                    {cell.is_half_day && <span style={{ color: '#d97706', fontSize: 10, marginLeft: 4 }}>· Half Day</span>}
                  </Typography>
                  {cell.leave_status && (
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: cell.leave_status === 'Approved' ? '#16a34a' : cell.leave_status === 'Pending' ? '#d97706' : '#dc2626' }}>
                      {cell.leave_status}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

function ProjectCard({ proj }) {
  const riskCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  Object.values(proj.cells || {}).forEach(c => { if (c?.risk_level) riskCounts[c.risk_level]++; });
  const topRisk = riskCounts.HIGH > 0 ? 'HIGH' : riskCounts.MEDIUM > 0 ? 'MEDIUM' : riskCounts.LOW > 0 ? 'LOW' : null;

  return (
    <Box sx={{ background: '#fff', borderRadius: '10px', border: '1px solid #e8eaed', px: 1.5, py: 1.25, display: 'flex', alignItems: 'center', gap: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1a1f2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {proj.project_name}
        </Typography>
      </Box>
      {topRisk && (
        <Chip label={topRisk} size="small" sx={{
          height: 20, fontSize: 9, fontWeight: 700,
          background: RISK_BG[topRisk], color: RISK_COLOR[topRisk],
          borderRadius: '4px', '& .MuiChip-label': { px: '6px' },
        }} />
      )}
    </Box>
  );
}

export default function MobileEmployeeList({
  dateStrip = [],
  employees = [],
  projects = [],
  loading,
  globalSearch,
  onGlobalSearchChange,
  searchMode,
  onSearchModeChange,
  onCellClick,
  showAll = false,
  onShowAllChange,
}) {
  const filtered = employees.filter(emp => {
    if (searchMode === 'EMP' && globalSearch && !emp.full_name.toLowerCase().includes(globalSearch.toLowerCase())) return false;
    if (!showAll) return Object.values(emp.cells || {}).some(c => c !== null);
    return true;
  });

  const filteredProjects = projects.filter(p =>
    searchMode !== 'PROJ' || !globalSearch || p.project_name.toLowerCase().includes(globalSearch.toLowerCase())
  );

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f0f2f5' }}>
      {/* Search bar */}
      <Box sx={{ px: 1.5, py: 1, background: '#fff', borderBottom: '1px solid #e8eaed', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, background: '#f8f9fb', border: '1px solid #e8eaed', borderRadius: '8px', px: 1, py: 0.75 }}>
          {/* Mode toggle */}
          <Box sx={{ display: 'flex', background: '#f0f2f5', borderRadius: '4px', p: '2px', gap: '2px', flexShrink: 0 }}>
            {['EMP', 'PROJ'].map(mode => (
              <Box
                key={mode}
                component="button"
                onClick={() => { onSearchModeChange(mode); onGlobalSearchChange(''); }}
                sx={{
                  px: '6px', py: '2px', borderRadius: '3px', border: 'none', cursor: 'pointer',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.3px',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  background: searchMode === mode ? '#ffffff' : 'transparent',
                  color: searchMode === mode ? '#1a1f2e' : '#9aa0ad',
                  boxShadow: searchMode === mode ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {mode}
              </Box>
            ))}
          </Box>
          <SearchIcon sx={{ fontSize: 14, color: '#9aa0ad', flexShrink: 0 }} />
          <InputBase
            placeholder={searchMode === 'EMP' ? 'Search Employees...' : 'Search Projects...'}
            value={globalSearch}
            onChange={e => onGlobalSearchChange(e.target.value)}
            sx={{ flex: 1, fontSize: 13, color: '#1a1f2e', '& input': { p: 0 } }}
          />
          {globalSearch && (
            <Box component="button" onClick={() => onGlobalSearchChange('')}
              sx={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#9aa0ad', p: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </Box>
          )}
        </Box>
      </Box>

      {/* Section label + Show All toggle */}
      <Box sx={{ px: 1.5, pt: 1.25, pb: 0.5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#9aa0ad', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          {searchMode === 'EMP'
            ? `${showAll ? 'All Employees' : 'On Leave'} (${filtered.length})`
            : `Projects (${filteredProjects.length})`}
        </Typography>
        {searchMode === 'EMP' && onShowAllChange && (
          <Box
            component="button"
            onClick={() => onShowAllChange(!showAll)}
            sx={{
              border: 'none', background: showAll ? '#eef2ff' : '#f0f2f5',
              borderRadius: '6px', px: 1, py: '3px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 0.5,
            }}
          >
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: showAll ? '#4338ca' : '#9aa0ad', letterSpacing: '0.3px' }}>
              {showAll ? 'On Leave Only' : 'Show All'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Scrollable list */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 2, display: 'flex', flexDirection: 'column', gap: 1, pt: 0.5 }}>
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <Box key={i} sx={{ height: 62, borderRadius: '10px', background: 'linear-gradient(90deg,#f0f2f5 0%,#e8eaed 50%,#f0f2f5 100%)' }} />
          ))
        ) : searchMode === 'EMP' ? (
          filtered.length === 0 ? (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 13, color: '#9aa0ad' }}>
                {globalSearch ? `No employees matching "${globalSearch}"` : 'No leave records in this period'}
              </Typography>
            </Box>
          ) : (
            filtered.map(emp => (
              <EmployeeCard
                key={emp.user_id}
                emp={emp}
                dateStrip={dateStrip}
                onCellClick={onCellClick}
              />
            ))
          )
        ) : (
          filteredProjects.length === 0 ? (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 13, color: '#9aa0ad' }}>
                {globalSearch ? `No projects matching "${globalSearch}"` : 'No projects to display'}
              </Typography>
            </Box>
          ) : (
            filteredProjects.map(proj => (
              <ProjectCard key={proj.project_id} proj={proj} />
            ))
          )
        )}
      </Box>
    </Box>
  );
}
