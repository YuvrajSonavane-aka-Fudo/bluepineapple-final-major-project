// src/components/dashboard/Dashboard.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { fmt, getWeekRange, getMonthRange, getTodayRange, shiftRange } from '../../utils/dateUtils';
import { fetchProjects, fetchEmployeeDashboard, fetchProjectDashboard } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Toolbar          from './Toolbar';
import EmployeePanel    from './EmployeePanel';
import ProjectPanel     from './ProjectPanel';
import DraggableDivider from './DraggableDivider';
import DetailPanel      from './DetailPanel';
import Legend           from './Legend';

export default function Dashboard() {
  const { logout } = useAuth();

  const [startDate, setStartDate] = useState(getWeekRange().start);
  const [endDate,   setEndDate]   = useState(getWeekRange().end);
  const [projects,        setProjects]        = useState([]);
  const [selectedProjIds, setSelectedProjIds] = useState([]);
  const [leaveTypes,      setLeaveTypes]      = useState([]);
  const [leaveStatuses,   setLeaveStatuses]   = useState([]);
  const [showAll,         setShowAll]         = useState(true);
  const [searchEmployee,  setSearchEmployee]  = useState('');
  const [searchProject,   setSearchProject]  = useState('');
  const [empData,         setEmpData]         = useState({ date_strip: [], employees: [] });
  const [projData,        setProjData]        = useState({ date_strip: [], projects: [] });
  const [loadingEmp,      setLoadingEmp]      = useState(false);
  const [loadingProj,     setLoadingProj]     = useState(false);
  const [detailCtx,       setDetailCtx]       = useState(null);
  const [legendVisible,   setLegendVisible]   = useState(true);

  const containerRef = useRef(null);
  const [empHeight, setEmpHeight] = useState(null);

  const handleResize = useCallback((clientY) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = clientY - rect.top;
    setEmpHeight(Math.max(120, Math.min(rect.height - 120, px)));
  }, []);

  const empScrollRef  = useRef(null);
  const projScrollRef = useRef(null);

  useEffect(() => {
    fetchProjects()
      .then(d => setProjects(d.projects || []))
      .catch(err => { if (err?.response?.status === 401) logout(); });
  }, [logout]);

  const buildBody = useCallback(() => ({
    start_date:     fmt(startDate),
    end_date:       fmt(endDate),
    project_ids:    selectedProjIds,
    leave_types:    leaveTypes,
    leave_statuses: leaveStatuses,
  }), [startDate, endDate, selectedProjIds, leaveTypes, leaveStatuses]);

  const fetchAll = useCallback(() => {
    const body = buildBody();
    setLoadingEmp(true);
    fetchEmployeeDashboard(body)
      .then(setEmpData)
      .catch(err => { if (err?.response?.status === 401) logout(); })
      .finally(() => setLoadingEmp(false));
    setLoadingProj(true);
    fetchProjectDashboard(body)
      .then(setProjData)
      .catch(err => { if (err?.response?.status === 401) logout(); })
      .finally(() => setLoadingProj(false));
  }, [buildBody, logout]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleClear = () => {
    const r = getWeekRange();
    setStartDate(r.start); setEndDate(r.end);
    setSelectedProjIds([]); setLeaveTypes([]); setLeaveStatuses([]);
    setSearchEmployee(''); setSearchProject(''); setDetailCtx(null);
  };

  const projectCellsByDate = {};
  (projData.projects || []).forEach(proj => {
    Object.entries(proj.cells || {}).forEach(([date, cell]) => {
      if (!cell || cell.employees_on_leave === 0) return;
      const order = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      if (!projectCellsByDate[date] || order[cell.risk_level] > order[projectCellsByDate[date]])
        projectCellsByDate[date] = cell.risk_level;
    });
  });

  const employeeCellsByDate = {};
  (empData.employees || []).forEach(emp => {
    Object.entries(emp.cells || {}).forEach(([date, cell]) => { if (cell) employeeCellsByDate[date] = true; });
  });

  return (
    <div style={s.root}>
      <Toolbar
        startDate={startDate} endDate={endDate}
        onRangeChange={(st, en) => { setStartDate(st); setEndDate(en); }}
        projects={projects}
        selectedProjectIds={selectedProjIds} onProjectsChange={setSelectedProjIds}
        leaveTypes={leaveTypes} onLeaveTypesChange={setLeaveTypes}
        leaveStatuses={leaveStatuses} onLeaveStatusesChange={setLeaveStatuses}
        showAll={showAll} onShowAllChange={setShowAll}
        onRefresh={fetchAll} onClear={handleClear}
        loading={loadingEmp || loadingProj}
      />

      {/* <FilterBar
        startDate={startDate} endDate={endDate}
        onRangeChange={(st, en) => { setStartDate(st); setEndDate(en); }}
        projects={projects}
        selectedProjectIds={selectedProjIds} onProjectsChange={setSelectedProjIds}
        leaveStatuses={leaveStatuses} onLeaveStatusesChange={setLeaveStatuses}
        leaveTypes={leaveTypes} onLeaveTypesChange={setLeaveTypes}
      /> */}

      <div style={s.content}>
        <div style={s.gridArea} ref={containerRef}>
          <div style={{ height: empHeight ?? '50%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <EmployeePanel
              dateStrip={empData.date_strip}
              employees={empData.employees || []}
              loading={loadingEmp}
              searchValue={searchEmployee}
              onSearchChange={setSearchEmployee}
              onCellClick={(emp, date) => setDetailCtx({ type: 'employee', emp, date: new Date(date), startDate, endDate })}
              onDateClick={(date) => setDetailCtx({ type: 'day', date: new Date(date), startDate, endDate })}
              scrollRef={empScrollRef}
              projectCells={projectCellsByDate}
            />
          </div>
          <DraggableDivider onResize={handleResize} />
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ProjectPanel
              dateStrip={projData.date_strip}
              projects={projData.projects || []}
              loading={loadingProj}
              searchValue={searchProject}
              onSearchChange={setSearchProject}
              onCellClick={(proj, date) => setDetailCtx({ type: 'project', project: proj, date: new Date(date), startDate, endDate })}
              onDateClick={(date) => setDetailCtx({ type: 'day', date: new Date(date), startDate, endDate })}
              scrollRef={projScrollRef}
              employeeCells={employeeCellsByDate}
            />
          </div>
        </div>
        <div style={{ position: 'relative', display: 'flex' }}>
          <div style={{ width: legendVisible ? 200 : 0, transition: 'width 0.3s ease', overflow: 'hidden' }}>
            <Legend />
          </div>
          <button onClick={() => setLegendVisible(!legendVisible)} style={{
            position: 'absolute', left: -30, top: 10,
            background: '#ffffff', border: '1px solid #e8eaed', borderRadius: 4,
            width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#9aa0ad', zIndex: 10,
          }} title="Toggle Legend">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points={legendVisible ? "15,18 9,12 15,6" : "9,18 15,12 9,6"}/>
            </svg>
          </button>
        </div>
      </div>

      <DetailPanel
        context={detailCtx}
        onClose={() => setDetailCtx(null)}
        filters={{ project_ids: selectedProjIds, leave_types: leaveTypes, leave_statuses: leaveStatuses }}
      />
    </div>
  );
}

// ── Secondary filter bar (white bar below navy toolbar) ──────────────────────
function FilterBar({ startDate, endDate, onRangeChange, projects, selectedProjectIds, onProjectsChange, leaveStatuses, onLeaveStatusesChange, leaveTypes, onLeaveTypesChange }) {
  const [activeQuick, setActiveQuick] = useState('WEEK');

  return (
    <div style={sb.root}>
      <span style={sb.filterLabel}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5a6272" strokeWidth="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
        Filters:
      </span>

      <button onClick={() => { const r = shiftRange(startDate, endDate, 'back'); onRangeChange(r.start, r.end); }} style={sb.arrowBtn}>‹</button>

      <div style={sb.dateRange}>
        <span style={sb.dateText}>{format(startDate, 'MMM dd, yyyy')}</span>
        <span style={sb.dateSep}>→</span>
        <span style={sb.dateText}>{format(endDate, 'MMM dd, yyyy')}</span>
      </div>

      <button onClick={() => { const r = shiftRange(startDate, endDate, 'forward'); onRangeChange(r.start, r.end); }} style={sb.arrowBtn}>›</button>

      <div style={sb.tabs}>
        {[
          { label: 'TODAY', fn: () => { const r = getTodayRange(); onRangeChange(r.start, r.end); setActiveQuick('TODAY'); } },
          { label: 'WEEK',  fn: () => { const r = getWeekRange();  onRangeChange(r.start, r.end); setActiveQuick('WEEK'); } },
          { label: 'MONTH', fn: () => { const r = getMonthRange(); onRangeChange(r.start, r.end); setActiveQuick('MONTH'); } },
        ].map(({ label, fn }) => (
          <button key={label} onClick={fn} style={{
            ...sb.tab,
            background: activeQuick === label ? '#ffffff' : 'transparent',
            color: activeQuick === label ? '#1a1f2e' : '#5a6272',
            fontWeight: activeQuick === label ? 700 : 500,
            borderBottom: activeQuick === label ? '2px solid #e85d26' : '2px solid transparent',
          }}>
            {label}
          </button>
        ))}
      </div>

      <div style={sb.sep} />

      <ProjectBtn projects={projects} selected={selectedProjectIds} onChange={onProjectsChange} />
      <StatusBtn  selected={leaveStatuses} onChange={onLeaveStatusesChange} />
      <LeaveTypeBtn selected={leaveTypes} onChange={onLeaveTypesChange} />
    </div>
  );
}

function ProjectBtn({ projects, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={sb.filterBtn}>
        <span style={sb.pDot}>P</span>
        {selected.length === 0 ? `All Projects (${projects.length})` : `${selected.length} Projects`}
        <ChevDown />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div style={sb.dropdown}>
            <label style={sb.dropItem}><input type="checkbox" checked={selected.length===0} onChange={()=>onChange([])} style={{accentColor:'#3b5bdb'}} /> All Projects</label>
            {projects.map(p => <label key={p.project_id} style={sb.dropItem}><input type="checkbox" checked={selected.includes(p.project_id)} onChange={()=>toggle(p.project_id)} style={{accentColor:'#3b5bdb'}} />{p.project_name}</label>)}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBtn({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const all = ['Approved','Pending','Rejected'];
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter(x=>x!==v) : [...selected, v]);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o=>!o)} style={sb.filterBtn}>
        <span style={{ ...sb.dot, background:'#16a34a' }} />
        {selected.length === 0 ? 'Status: Approved' : selected.join(', ')}
        <ChevDown />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div style={sb.dropdown}>
            {all.map(s => <label key={s} style={sb.dropItem}><input type="checkbox" checked={selected.includes(s)} onChange={()=>toggle(s)} style={{accentColor:'#3b5bdb'}} />{s}</label>)}
          </div>
        </>
      )}
    </div>
  );
}

function LeaveTypeBtn({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const all = ['Paid','Sick','WFH','Half Day','Conference'];
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter(x=>x!==v) : [...selected, v]);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o=>!o)} style={sb.filterBtn}>
        <span style={{ ...sb.dot, background:'#e85d26' }} />
        <span style={{ ...sb.dot, background:'#3b5bdb', marginLeft:-5 }} />
        {selected.length === 0 ? 'Leave Types' : `${selected.length} Types`}
        <ChevDown />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div style={sb.dropdown}>
            {all.map(lt => <label key={lt} style={sb.dropItem}><input type="checkbox" checked={selected.includes(lt)} onChange={()=>toggle(lt)} style={{accentColor:'#3b5bdb'}} />{lt}</label>)}
          </div>
        </>
      )}
    </div>
  );
}

function ChevDown() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>;
}

const sb = {
  root: { height:48, background:'#ffffff', borderBottom:'1px solid #e8eaed', display:'flex', alignItems:'center', padding:'0 16px', gap:10, flexShrink:0 },
  filterLabel: { display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#5a6272', flexShrink:0 },
  arrowBtn: { width:24, height:24, background:'#f0f2f5', border:'1px solid #e8eaed', borderRadius:5, color:'#5a6272', fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
  dateRange: { display:'flex', alignItems:'center', gap:6, padding:'4px 12px', background:'#f8f9fb', border:'1px solid #e8eaed', borderRadius:7, fontFamily:"'DM Mono', monospace" },
  dateText: { fontSize:12, color:'#1a1f2e', fontWeight:500 },
  dateSep: { fontSize:11, color:'#9aa0ad' },
  tabs: { display:'flex', gap:0, background:'#f0f2f5', borderRadius:8, padding:3 },
  tab: { padding:'4px 12px', borderRadius:6, fontSize:12, cursor:'pointer', border:'none', fontFamily:"'Plus Jakarta Sans', sans-serif", transition:'all 120ms', boxSizing:'border-box' },
  sep: { width:1, height:20, background:'#e8eaed', flexShrink:0 },
  filterBtn: { display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:'#ffffff', border:'1px solid #e8eaed', borderRadius:8, color:'#1a1f2e', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:"'Plus Jakarta Sans', sans-serif", whiteSpace:'nowrap' },
  pDot: { display:'inline-flex', width:16, height:16, background:'#eef2ff', borderRadius:4, fontSize:10, fontWeight:700, color:'#3b5bdb', alignItems:'center', justifyContent:'center', flexShrink:0 },
  dot: { display:'inline-block', width:8, height:8, borderRadius:'50%', flexShrink:0 },
  dropdown: { position:'absolute', top:'100%', left:0, marginTop:6, background:'#fff', border:'1px solid #e8eaed', borderRadius:10, padding:6, minWidth:180, boxShadow:'0 8px 24px rgba(0,0,0,0.1)', zIndex:100, display:'flex', flexDirection:'column', gap:2 },
  dropItem: { display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:6, cursor:'pointer', fontSize:13, color:'#1a1f2e' },
};

const s = {
  root: { display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'#f0f2f5' },
  content: { flex:1, display:'flex', overflow:'hidden', background:'#ffffff' },
  gridArea: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
};
