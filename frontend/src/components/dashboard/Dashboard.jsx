// src/components/dashboard/Dashboard.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Box } from '@mui/material';
import { fmt, getWeekRange } from '../../utils/dateUtils';
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
  const [showAll,         setShowAll]         = useState(false);
  const [hideWeekends,    setHideWeekends]    = useState(false);
  const [searchEmployee,  setSearchEmployee]  = useState('');
  const [searchProject,   setSearchProject]   = useState('');
  const [empData,         setEmpData]         = useState({ date_strip: [], employees: [] });
  const [projData,        setProjData]        = useState({ date_strip: [], projects: [] });
  const [loadingEmp,      setLoadingEmp]      = useState(false);
  const [loadingProj,     setLoadingProj]     = useState(false);
  const [detailCtx,       setDetailCtx]       = useState(null);
  const [legendVisible,   setLegendVisible]   = useState(false);

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
    fetchEmployeeDashboard(body).then(setEmpData).catch(err => { if (err?.response?.status === 401) logout(); }).finally(() => setLoadingEmp(false));
    setLoadingProj(true);
    fetchProjectDashboard(body).then(setProjData).catch(err => { if (err?.response?.status === 401) logout(); }).finally(() => setLoadingProj(false));
  }, [buildBody, logout]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleClear = () => {
    const r = getWeekRange();
    setStartDate(r.start); setEndDate(r.end);
    setSelectedProjIds([]); setLeaveTypes([]); setLeaveStatuses([]);
    setSearchEmployee(''); setSearchProject(''); setDetailCtx(null);
    setShowAll(false); setHideWeekends(false);
  };

  const filteredEmpDateStrip  = hideWeekends ? (empData.date_strip  || []).filter(d => !d.is_weekend) : (empData.date_strip  || []);
  const filteredProjDateStrip = hideWeekends ? (projData.date_strip || []).filter(d => !d.is_weekend) : (projData.date_strip || []);

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

  const makeCtx = (rect, extra, preferAbove) => ({
    ...extra, startDate, endDate,
    anchorX:    rect.left + rect.width / 2,
    anchorY:    rect.bottom,
    anchorYTop: rect.top,
    preferAbove,
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#f0f2f5' }}>
      <Toolbar
        startDate={startDate} endDate={endDate}
        onRangeChange={(st, en) => { setStartDate(st); setEndDate(en); }}
        projects={projects}
        selectedProjectIds={selectedProjIds} onProjectsChange={setSelectedProjIds}
        leaveTypes={leaveTypes} onLeaveTypesChange={setLeaveTypes}
        leaveStatuses={leaveStatuses} onLeaveStatusesChange={setLeaveStatuses}
        onRefresh={fetchAll} onClear={handleClear}
        loading={loadingEmp || loadingProj}
      />

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#ffffff', alignItems: 'stretch' }}>
        <Box ref={containerRef} sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ height: empHeight ?? '50%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <EmployeePanel
              dateStrip={filteredEmpDateStrip}
              employees={empData.employees || []}
              loading={loadingEmp}
              searchValue={searchEmployee}
              onSearchChange={setSearchEmployee}
              onCellClick={(emp, date, rect) => setDetailCtx(makeCtx(rect, { type: 'employee', emp, date: new Date(date), leaveStatus: emp.cells?.[date]?.leave_status || null }, false))}
              onDateClick={(date, rect) => {
                const info = (empData.date_strip || []).find(d => d.date === date);
                if (info?.is_weekend) return;
                setDetailCtx(makeCtx(rect, { type: 'day', date: new Date(date) }, false));
              }}
              scrollRef={empScrollRef}
              projectCells={projectCellsByDate}
              showAll={showAll}
            />
          </Box>
          <DraggableDivider onResize={handleResize} />
          <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ProjectPanel
              dateStrip={filteredProjDateStrip}
              projects={projData.projects || []}
              loading={loadingProj}
              searchValue={searchProject}
              onSearchChange={setSearchProject}
              onCellClick={(proj, date, rect) => setDetailCtx(makeCtx(rect, { type: 'project', project: proj, date: new Date(date) }, true))}
              onDateClick={(date, rect) => {
                const info = (projData.date_strip || []).find(d => d.date === date);
                if (info?.is_weekend) return;
                setDetailCtx(makeCtx(rect, { type: 'day', date: new Date(date) }, true));
              }}
              scrollRef={projScrollRef}
              employeeCells={employeeCellsByDate}
            />
          </Box>
        </Box>

        {/* Legend */}
        <Box sx={{ position: 'relative', display: 'flex' }}>
          <Box className="legend-scroll" sx={{ width: legendVisible ? 220 : 0, height: '100%', transition: 'width 0.3s ease', overflowX: 'hidden', overflowY: legendVisible ? 'auto' : 'hidden' }}>
            <Legend showAll={showAll} onShowAllChange={setShowAll} hideWeekends={hideWeekends} onHideWeekendsChange={setHideWeekends} />
          </Box>
          <Box
            component="button"
            onClick={() => setLegendVisible(!legendVisible)}
            sx={{ position: 'absolute', left: -30, top: 10, background: '#ffffff', border: '1px solid #e8eaed', borderRadius: '4px', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa0ad', zIndex: 10 }}
            title="Toggle Legend"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points={legendVisible ? "9,18 15,12 9,6" : "15,18 9,12 15,6"}/>
            </svg>
          </Box>
        </Box>
      </Box>

      <DetailPanel
        context={detailCtx}
        onClose={() => setDetailCtx(null)}
        filters={{ project_ids: selectedProjIds, leave_types: leaveTypes, leave_statuses: leaveStatuses }}
      />
    </Box>
  );
}
