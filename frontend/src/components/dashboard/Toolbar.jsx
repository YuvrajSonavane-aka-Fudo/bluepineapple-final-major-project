// src/components/dashboard/Toolbar.jsx
import { useState } from 'react';
import { format } from 'date-fns';
import { fmt, getWeekRange, getMonthRange, getTodayRange, shiftRange } from '../../utils/dateUtils';
import { useAuth } from '../../hooks/useAuth';

export default function Toolbar({
  startDate, endDate, onRangeChange,
  projects, selectedProjectIds, onProjectsChange,
  leaveStatuses, onLeaveStatusesChange,
  leaveTypes, onLeaveTypesChange,
  showAll, onShowAllChange,
  onRefresh, onClear, loading,
}) {
  const { session, logout } = useAuth();
  const [projOpen, setProjOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  const ALL_STATUSES = ['Approved', 'Pending', 'Rejected'];
  const ALL_TYPES    = ['Paid', 'Sick', 'WFH', 'Half Day', 'Conference'];

  const toggleArr = (arr, val, setter) =>
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const activeLabel = (arr, allLabel) =>
    arr.length === 0 ? allLabel : arr.length === 1 ? arr[0] : `${arr[0]} +${arr.length - 1}`;

  const initials = (session?.user_role || 'U').slice(0, 2).toUpperCase();

  return (
    <div style={s.root}>
      {/* LEFT: Logo + title */}
      <div style={s.left}>
        <div style={s.logo}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="8" height="8" rx="2" fill="white"/>
            <rect x="13" y="3" width="8" height="8" rx="2" fill="white" opacity="0.5"/>
            <rect x="3" y="13" width="8" height="8" rx="2" fill="white" opacity="0.5"/>
            <rect x="13" y="13" width="8" height="8" rx="2" fill="white" opacity="0.8"/>
          </svg>
        </div>
        <span style={s.title}>Leave Impact Dashboard</span>
      </div>

      {/* CENTER: Date navigation */}
      <div style={s.center}>
        {/* Filter icon */}
        <span style={s.filterLabel}>
          <FilterIcon /> Filters:
        </span>

        {/* Arrow back */}
        <button onClick={() => { const r = shiftRange(startDate, endDate, 'back'); onRangeChange(r.start, r.end); }} style={s.arrowBtn}>‹</button>

        {/* Date range display */}
        <div style={s.dateRange}>
          <input type="date" value={fmt(startDate)} onChange={e => { 
            const newStart = new Date(e.target.value);
            if (newStart > endDate) {
              alert('Start date cannot be greater than end date');
              return;
            }
            onRangeChange(newStart, endDate);
          }} style={s.dateInput} />
          <span style={s.dateDash}>—</span>
          <input type="date" value={fmt(endDate)} onChange={e => { 
            const newEnd = new Date(e.target.value);
            if (newEnd < startDate) {
              alert('End date cannot be less than start date');
              return;
            }
            onRangeChange(startDate, newEnd);
          }} style={s.dateInput} />
        </div>

        {/* Arrow forward */}
        <button onClick={() => { const r = shiftRange(startDate, endDate, 'forward'); onRangeChange(r.start, r.end); }} style={s.arrowBtn}>›</button>

        {/* Quick filter tabs */}
        <div style={s.tabs}>
          {[
            { label: 'TODAY', fn: () => { const r = getTodayRange();  onRangeChange(r.start, r.end); } },
            { label: 'WEEK',  fn: () => { const r = getWeekRange();   onRangeChange(r.start, r.end); } },
            { label: 'MONTH', fn: () => { const r = getMonthRange();  onRangeChange(r.start, r.end); } },
          ].map(({ label, fn }) => (
            <button key={label} onClick={fn} style={s.tab}>{label}</button>
          ))}
        </div>

        <div style={s.sep} />

        {/* Projects dropdown */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { setProjOpen(o => !o); setStatusOpen(false); setTypeOpen(false); }} style={s.filterBtn}>
            <span style={s.filterDot}>P</span>
            {selectedProjectIds.length === 0 ? `All Projects (${projects.length})` : `${selectedProjectIds.length} Projects`}
            <ChevronIcon />
          </button>
          {projOpen && (
            <Dropdown onClose={() => setProjOpen(false)}>
              <DropdownItem label="All Projects" checked={selectedProjectIds.length === 0} onClick={() => onProjectsChange([])} />
              {projects.map(p => (
                <DropdownItem key={p.project_id} label={p.project_name}
                  checked={selectedProjectIds.includes(p.project_id)}
                  onClick={() => toggleArr(selectedProjectIds, p.project_id, onProjectsChange)} />
              ))}
            </Dropdown>
          )}
        </div>

        {/* Status dropdown */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { setStatusOpen(o => !o); setProjOpen(false); setTypeOpen(false); }} style={s.filterBtn}>
            <span style={{ ...s.filterDot, background: '#16a34a' }} />
            {activeLabel(leaveStatuses, 'Status: Approved')}
            <ChevronIcon />
          </button>
          {statusOpen && (
            <Dropdown onClose={() => setStatusOpen(false)}>
              {ALL_STATUSES.map(st => (
                <DropdownItem key={st} label={st}
                  checked={leaveStatuses.includes(st)}
                  onClick={() => toggleArr(leaveStatuses, st, onLeaveStatusesChange)} />
              ))}
            </Dropdown>
          )}
        </div>

        {/* Leave Types dropdown */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { setTypeOpen(o => !o); setProjOpen(false); setStatusOpen(false); }} style={s.filterBtn}>
            <span style={{ ...s.filterDot, background: '#e85d26' }} />
            <span style={{ ...s.filterDot, background: '#3b5bdb', marginLeft: -6 }} />
            {activeLabel(leaveTypes, 'Leave Types')}
            <ChevronIcon />
          </button>
          {typeOpen && (
            <Dropdown onClose={() => setTypeOpen(false)}>
              {ALL_TYPES.map(lt => (
                <DropdownItem key={lt} label={lt}
                  checked={leaveTypes.includes(lt)}
                  onClick={() => toggleArr(leaveTypes, lt, onLeaveTypesChange)} />
              ))}
            </Dropdown>
          )}
        </div>
      </div>

      {/* RIGHT: Actions + avatar */}
      <div style={s.right}>
        {/* Refresh */}
        <button onClick={onRefresh} style={s.iconBtn} title="Refresh" disabled={loading}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}>
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>

        {/* Clear */}
        <button onClick={onClear} style={s.iconBtn} title="Clear filters">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* Filter icon */}
        <button style={s.iconBtn} title="Filters">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
        </button>

        {/* All Employees toggle */}
        <div style={s.toggleWrap}>
          <span style={s.toggleLabel}>All Employees</span>
          <div onClick={() => onShowAllChange(!showAll)} style={{
            ...s.toggle,
            background: showAll ? '#3b82f6' : '#d1d5db',
          }}>
            <div style={{ ...s.toggleThumb, transform: showAll ? 'translateX(18px)' : 'translateX(2px)' }} />
          </div>
        </div>

        {/* User avatar */}
        <div style={s.avatar}>{initials}</div>
      </div>
    </div>
  );
}

function Dropdown({ children, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
      <div style={{
        position: 'absolute', top: '100%', left: 0, marginTop: 6,
        background: '#fff', border: '1px solid #e8eaed',
        borderRadius: 10, padding: 6, minWidth: 180,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        zIndex: 100,
      }}>
        {children}
      </div>
    </>
  );
}

function DropdownItem({ label, checked, onClick }) {
  return (
    <label onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px', borderRadius: 6,
      cursor: 'pointer', fontSize: 13, color: '#1a1f2e',
      background: checked ? '#f0f7ff' : 'transparent',
    }}>
      <input type="checkbox" checked={checked} onChange={() => {}} style={{ accentColor: '#3b82f6', width: 14, height: 14 }} />
      {label}
    </label>
  );
}

function FilterIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline' }}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>;
}
function ChevronIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"/>
  </svg>;
}

const s = {
  root: {
    height: 52,
    background: '#1e2d5a',
    display: 'flex', alignItems: 'center',
    padding: '0 16px', gap: 12, flexShrink: 0,
    position: 'relative', zIndex: 10,
  },
  left: {
    display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
  },
  logo: {
    width: 32, height: 32,
    background: 'rgba(255,255,255,0.15)',
    borderRadius: 7,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    color: '#ffffff', fontWeight: 700, fontSize: 14,
    letterSpacing: '-0.2px',
  },
  center: {
    flex: 1,
    display: 'flex', alignItems: 'center', gap: 8,
    justifyContent: 'center',
  },
  filterLabel: {
    color: 'rgba(255,255,255,0.7)', fontSize: 12,
    display: 'flex', alignItems: 'center', gap: 4,
  },
  arrowBtn: {
    width: 26, height: 26,
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 5,
    color: '#fff', fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    lineHeight: 1,
  },
  dateRange: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 7, padding: '4px 10px',
  },
  dateInput: {
    background: 'transparent', border: 'none',
    color: '#fff', fontSize: 12,
    fontFamily: "'DM Mono', monospace",
    cursor: 'pointer', outline: 'none',
    colorScheme: 'dark',
    width: 88,
  },
  dateDash: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  tabs: {
    display: 'flex', gap: 2,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 7, padding: 2,
  },
  tab: {
    padding: '4px 10px', borderRadius: 5,
    fontSize: 11, fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer', letterSpacing: '0.3px',
    transition: 'background 120ms, color 120ms',
    background: 'transparent', border: 'none',
  },
  sep: {
    width: 1, height: 20, background: 'rgba(255,255,255,0.2)', flexShrink: 0,
  },
  filterBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 10px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 7, color: '#fff', fontSize: 12,
    cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
    whiteSpace: 'nowrap',
  },
  filterDot: {
    display: 'inline-flex', width: 8, height: 8,
    borderRadius: '50%', background: '#3b82f6', flexShrink: 0,
  },
  right: {
    display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
  },
  iconBtn: {
    width: 32, height: 32,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 7, color: 'rgba(255,255,255,0.8)',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  toggleWrap: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  toggleLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, whiteSpace: 'nowrap' },
  toggle: {
    width: 40, height: 22, borderRadius: 99,
    cursor: 'pointer', position: 'relative',
    transition: 'background 200ms', flexShrink: 0,
  },
  toggleThumb: {
    position: 'absolute', top: 3,
    width: 16, height: 16, borderRadius: '50%',
    background: '#fff',
    transition: 'transform 200ms',
  },
  avatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: '#e85d26',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, color: '#fff',
    flexShrink: 0,
  },
};
