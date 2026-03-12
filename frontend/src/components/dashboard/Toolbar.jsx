// src/components/dashboard/Toolbar.jsx
import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { fmt, getWeekRange, getMonthRange, getTodayRange, getYearRange, shiftRange } from '../../utils/dateUtils';
import { useAuth } from '../../hooks/useAuth';
import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined';
import CachedOutlinedIcon from '@mui/icons-material/CachedOutlined';

export default function Toolbar({
  startDate, endDate, onRangeChange,
  projects, selectedProjectIds, onProjectsChange,
  leaveStatuses, onLeaveStatusesChange,
  leaveTypes, onLeaveTypesChange,
  onRefresh, onClear, loading,
}) {
  const { session, logout } = useAuth();
  const [projOpen,   setProjOpen]   = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [typeOpen,   setTypeOpen]   = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const startInputRef = useRef(null);
  const endInputRef   = useRef(null);

  const ALL_STATUSES = ['Approved', 'Pending', 'Rejected'];
  const ALL_TYPES    = ['Paid', 'Unpaid', 'WFH', 'Half Day'];

  const getActiveFilter = () => {
    const today = getTodayRange();
    const week  = getWeekRange();
    const month = getMonthRange();
    const year  = getYearRange();
    const isSameDay = (d1, d2) => d1.toDateString() === d2.toDateString();
    if (isSameDay(startDate, today.start) && isSameDay(endDate, today.end)) return 'T';
    if (isSameDay(startDate, week.start)  && isSameDay(endDate, week.end))  return 'W';
    if (isSameDay(startDate, month.start) && isSameDay(endDate, month.end)) return 'M';
    if (isSameDay(startDate, year.start)  && isSameDay(endDate, year.end))  return 'Y';
    return null;
  };

  const activeFilter = getActiveFilter();

  const fmtDisplay = (d) => format(d instanceof Date ? d : new Date(d), 'MMM dd, yyyy');

  const toggleArr = (arr, val, setter) =>
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const activeLabel = (arr, allLabel) =>
    arr.length === 0 ? allLabel : arr.length === 1 ? arr[0] : `${arr[0]} +${arr.length - 1}`;

  const QUICK_FILTERS = [
    { label: 'T', tooltip: 'Today',      fn: () => { const r = getTodayRange(); onRangeChange(r.start, r.end); } },
    { label: 'W', tooltip: 'This Week',  fn: () => { const r = getWeekRange();  onRangeChange(r.start, r.end); } },
    { label: 'M', tooltip: 'This Month', fn: () => { const r = getMonthRange(); onRangeChange(r.start, r.end); } },
    { label: 'Y', tooltip: 'This Year',  fn: () => { const r = getYearRange();  onRangeChange(r.start, r.end); } },
  ];

  return (
    <>
      <div style={s.root}>
        {/* LEFT: Logo + title */}
        <div style={s.left}>
          <div style={s.logo}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3"  y="3"  width="8" height="8" rx="2" fill="white"/>
              <rect x="13" y="3"  width="8" height="8" rx="2" fill="white" opacity="0.5"/>
              <rect x="3"  y="13" width="8" height="8" rx="2" fill="white" opacity="0.5"/>
              <rect x="13" y="13" width="8" height="8" rx="2" fill="white" opacity="0.8"/>
            </svg>
          </div>
          <span style={s.title}>Leave Impact Dashboard</span>
        </div>

        {/* CENTER: Date navigation */}
        <div style={s.center}>
          <span style={s.filterLabel}>
            <FilterIcon /> Filters:
          </span>

          <button
            onClick={() => { const r = shiftRange(startDate, endDate, 'back'); onRangeChange(r.start, r.end); }}
            style={s.arrowBtn}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          {/* Date range */}
          <div style={s.dateRange}>
            {/* Start date */}
            <div style={s.datePickerWrap}>
              <span style={s.dateDisplay}>{fmtDisplay(startDate)}</span>
              <button
                style={s.calBtn}
                onClick={() => startInputRef.current?.showPicker?.() || startInputRef.current?.click()}
                title="Pick start date"
              >
                <CalendarIcon />
              </button>
              <input
                ref={startInputRef}
                type="date"
                value={fmt(startDate)}
                onChange={e => {
                  const newStart = new Date(e.target.value);
                  if (!isNaN(newStart) && newStart <= endDate) onRangeChange(newStart, endDate);
                }}
                style={s.hiddenInput}
              />
            </div>

            <span style={s.dateDash}>—</span>

            {/* End date */}
            <div style={s.datePickerWrap}>
              <span style={s.dateDisplay}>{fmtDisplay(endDate)}</span>
              <button
                style={s.calBtn}
                onClick={() => endInputRef.current?.showPicker?.() || endInputRef.current?.click()}
                title="Pick end date"
              >
                <CalendarIcon />
              </button>
              <input
                ref={endInputRef}
                type="date"
                value={fmt(endDate)}
                onChange={e => {
                  const newEnd = new Date(e.target.value);
                  if (!isNaN(newEnd) && newEnd >= startDate) onRangeChange(startDate, newEnd);
                }}
                style={s.hiddenInput}
              />
            </div>
          </div>

          <button
            onClick={() => { const r = shiftRange(startDate, endDate, 'forward'); onRangeChange(r.start, r.end); }}
            style={s.arrowBtn}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          {/* Quick filter tabs */}
          <div style={s.tabs}>
            {QUICK_FILTERS.map(({ label, tooltip, fn }) => (
              <div key={label} style={{ position: 'relative' }}>
                <button
                  onClick={fn}
                  style={{ ...s.tab, ...(activeFilter === label && s.tabActive) }}
                  onMouseEnter={e => { const t = e.currentTarget.nextSibling; if (t) t.style.opacity = '1'; }}
                  onMouseLeave={e => { const t = e.currentTarget.nextSibling; if (t) t.style.opacity = '0'; }}
                >
                  {label}
                </button>
                <div style={s.tooltip}>{tooltip}</div>
              </div>
            ))}
          </div>

          <div style={s.sep} />

          {/* Projects dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setProjOpen(o => !o); setStatusOpen(false); setTypeOpen(false); }}
              style={s.filterBtn}
            >
              <span style={{ ...s.filterDot, width: 15, height: 15, paddingLeft: '4px' }}>P</span>
              {selectedProjectIds.length === 0 ? `All Projects (${projects.length})` : `${selectedProjectIds.length} Projects`}
              <ChevronIcon />
            </button>
            {projOpen && (
              <Dropdown onClose={() => setProjOpen(false)} scrollable maxWidth={320}>
                <DropdownItem
                  label="All Projects"
                  checked={selectedProjectIds.length === 0}
                  onClick={e => { e.stopPropagation(); onProjectsChange([]); }}
                />
                {projects.map(p => (
                  <DropdownItem
                    key={p.project_id}
                    label={p.project_name}
                    checked={selectedProjectIds.includes(p.project_id)}
                    onClick={e => { e.stopPropagation(); toggleArr(selectedProjectIds, p.project_id, onProjectsChange); }}
                  />
                ))}
              </Dropdown>
            )}
          </div>

          {/* Status dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setStatusOpen(o => !o); setProjOpen(false); setTypeOpen(false); }}
              style={s.filterBtn}
            >
              <span style={{ ...s.filterDot, background: '#16a34a' }} />
              {activeLabel(leaveStatuses, 'Status: Approved')}
              <ChevronIcon />
            </button>
            {statusOpen && (
              <Dropdown onClose={() => setStatusOpen(false)}>
                {ALL_STATUSES.map(st => (
                  <DropdownItem
                    key={st}
                    label={st}
                    checked={leaveStatuses.includes(st)}
                    onClick={e => { e.stopPropagation(); toggleArr(leaveStatuses, st, onLeaveStatusesChange); }}
                  />
                ))}
              </Dropdown>
            )}
          </div>

          {/* Leave Types dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setTypeOpen(o => !o); setProjOpen(false); setStatusOpen(false); }}
              style={s.filterBtn}
            >
              <span style={{ ...s.filterDot, background: '#e85d26' }} />
              <span style={{ ...s.filterDot, background: '#3b5bdb', marginLeft: -6 }} />
              {activeLabel(leaveTypes, 'Leave Types')}
              <ChevronIcon />
            </button>
            {typeOpen && (
              <Dropdown onClose={() => setTypeOpen(false)}>
                {ALL_TYPES.map(lt => (
                  <DropdownItem
                    key={lt}
                    label={lt}
                    checked={leaveTypes.includes(lt)}
                    onClick={e => { e.stopPropagation(); toggleArr(leaveTypes, lt, onLeaveTypesChange); }}
                  />
                ))}
              </Dropdown>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div style={s.right}>
          <button onClick={onRefresh} style={s.iconBtn} title="Refresh" disabled={loading}>
            <CachedOutlinedIcon sx={{ fontSize: 18, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          <button onClick={onClear} style={s.iconBtn} title="Clear filters">
            <FilterAltOffOutlinedIcon sx={{ fontSize: 18 }} />
          </button>

          <button onClick={() => setShowLogoutModal(true)} style={s.iconBtn} title="Logout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5m0 0l-5-5m5 5H9"/>
            </svg>
          </button>
        </div>
      </div>

      {showLogoutModal && (
        <LogoutModal
          onConfirm={() => { setShowLogoutModal(false); logout(); }}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div style={m.overlay} onClick={onCancel}>
      <div style={m.box} onClick={e => e.stopPropagation()}>
        <div style={m.iconWrap}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e85d26" strokeWidth="2.2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5m0 0l-5-5m5 5H9"/>
          </svg>
        </div>
        <p style={m.title}>Sign out?</p>
        <p style={m.sub}>You'll need to sign back in to access the dashboard.</p>
        <div style={m.actions}>
          <button onClick={onCancel} style={m.cancelBtn}
            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>Cancel</button>
          <button onClick={onConfirm} style={m.confirmBtn}
            onMouseEnter={e => e.currentTarget.style.background = '#162347'}
            onMouseLeave={e => e.currentTarget.style.background = '#1e2d5a'}>Yes, sign out</button>
        </div>
      </div>
    </div>
  );
}

function Dropdown({ children, onClose, scrollable = false, maxWidth = 280 }) {
  return (
    <>
      <div
        onClick={e => { e.stopPropagation(); onClose(); }}
        style={{ position: 'fixed', inset: 0, zIndex: 98 }}
      />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 6,
          background: '#fff', border: '1px solid #e8eaed',
          borderRadius: 10, padding: 6,
          minWidth: 180, maxWidth, width: 'max-content',
          ...(scrollable && {
            maxHeight: 260, overflowY: 'auto', overflowX: 'hidden',
            scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent',
          }),
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 99,
        }}
      >
        {children}
      </div>
    </>
  );
}

function DropdownItem({ label, checked, onClick }) {
  return (
    <label
      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onClick(e); }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '8px 10px', borderRadius: 6,
        cursor: 'pointer', fontSize: 13, color: '#1a1f2e',
        background: checked ? '#f0f7ff' : 'transparent',
        wordBreak: 'break-word',
        userSelect: 'none',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => {}}
        style={{ accentColor: '#3b82f6', width: 14, height: 14, flexShrink: 0, marginTop: 1 }}
      />
      {label}
    </label>
  );
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline' }}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const m = {
  overlay:    { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  box:        { background: '#fff', borderRadius: 16, padding: '32px 28px 24px', width: 300, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  iconWrap:   { width: 54, height: 54, borderRadius: '50%', background: '#fff5f0', border: '1.5px solid #fcd9c8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title:      { margin: 0, fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' },
  sub:        { margin: '4px 0 18px', fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 1.55 },
  actions:    { display: 'flex', gap: 10, width: '100%' },
  cancelBtn:  { flex: 1, padding: '10px 0', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 150ms' },
  confirmBtn: { flex: 1, padding: '10px 0', borderRadius: 9, border: 'none', background: '#1e2d5a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 150ms' },
};

const s = {
  root:          { height: 52, background: '#1e2d5a', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0, position: 'relative', zIndex: 10 },
  left:          { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  logo:          { width: 32, height: 32, background: 'rgba(255,255,255,0.15)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title:         { color: '#ffffff', fontWeight: 700, fontSize: 14, letterSpacing: '-0.2px' },
  center:        { flex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' },
  filterLabel:   { color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 },
  arrowBtn:      { width: 26, height: 26, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 5, color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 },
  dateRange:     { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 7, padding: '3px 8px' },
  datePickerWrap:{ display: 'flex', alignItems: 'center', gap: 4 },
  dateDisplay:   { color: '#fff', fontSize: 12, fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap' },
  calBtn:        { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 0, lineHeight: 1 },
  hiddenInput:   { position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' },
  dateDash:      { color: 'rgba(255,255,255,0.5)', fontSize: 12, paddingBottom: 2 },
  tabs:          { display: 'flex', gap: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 7, padding: '2px' },
  tab:           { padding: '4px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', letterSpacing: '0.3px', transition: 'background 120ms, color 120ms', background: 'transparent', border: 'none' },
  tabActive:     { background: 'rgba(255,255,255,0.25)', color: '#ffffff' },
  tooltip:       { position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.92)', color: '#fff', fontSize: 11, fontWeight: 500, padding: '4px 8px', borderRadius: 5, whiteSpace: 'nowrap', pointerEvents: 'none', opacity: 0, transition: 'opacity 150ms', zIndex: 200 },
  sep:           { width: 1, height: 20, background: 'rgba(255,255,255,0.2)', flexShrink: 0 },
  filterBtn:     { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 7, color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap' },
  filterDot:     { display: 'inline-flex', width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 },
  right:         { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  iconBtn:       { width: 32, height: 32, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 7, color: 'rgba(255,255,255,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};