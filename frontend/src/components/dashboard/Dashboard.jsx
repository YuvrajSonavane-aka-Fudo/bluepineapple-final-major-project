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
import SharedHeader     from './SharedHeader';

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
  const [globalSearch,    setGlobalSearch]    = useState('');
  const [searchMode,      setSearchMode]      = useState('EMP');
  const [empData,         setEmpData]         = useState({ date_strip: [], employees: [] });
  const [projData,        setProjData]        = useState({ date_strip: [], projects: [] });
  const [loadingEmp,      setLoadingEmp]      = useState(false);
  const [loadingProj,     setLoadingProj]     = useState(false);
  const [detailCtx,       setDetailCtx]       = useState(null);
  const [legendVisible,   setLegendVisible]   = useState(false);

  const containerRef = useRef(null);
  const [empHeight, setEmpHeight] = useState(null);

  const empScrollRef    = useRef(null);
  const projScrollRef   = useRef(null);
  const headerScrollRef = useRef(null);

  const handleResize = useCallback((clientY) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = clientY - rect.top;
    setEmpHeight(Math.max(120, Math.min(rect.height - 120, px)));
  }, []);

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
    setGlobalSearch(''); setDetailCtx(null);
    setShowAll(false); setHideWeekends(false);
  };

  const filteredDateStrip = hideWeekends
    ? (empData.date_strip || []).filter(d => !d.is_weekend)
    : (empData.date_strip || []);

  const projectCellsByDate = {};
  (projData.projects || []).forEach(proj => {
    Object.entries(proj.cells || {}).forEach(([date, cell]) => {
      if (!cell || (cell.employees_on_leave ?? 0) === 0) return;
      const order = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const rl = cell.risk_level;
      if (!rl) return;
      if (!projectCellsByDate[date] || order[rl] > order[projectCellsByDate[date]])
        projectCellsByDate[date] = rl;
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

  // Export filters — includes all active selection criteria
  const exportFilters = {
    start_date:     fmt(startDate),
    end_date:       fmt(endDate),
    project_ids:    selectedProjIds,
    leave_types:    leaveTypes,
    leave_statuses: leaveStatuses,
  };

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

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#ffffff', alignItems: 'stretch', position: 'relative' }}>
        <Box ref={containerRef} sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          <SharedHeader
            dateStrip={filteredDateStrip}
            projectCells={projectCellsByDate}
            employeeCells={employeeCellsByDate}
            globalSearch={globalSearch}
            onGlobalSearchChange={setGlobalSearch}
            searchMode={searchMode}
            onSearchModeChange={(mode) => { setSearchMode(mode); setGlobalSearch(''); }}
            onDateClick={(date, rect) => {
              const info = filteredDateStrip.find(d => d.date === date);
              if (info?.is_weekend) return;
              setDetailCtx(makeCtx(rect, { type: 'day', date: new Date(date) }, false));
            }}
            scrollRef={headerScrollRef}
            empScrollRef={empScrollRef}
            projScrollRef={projScrollRef}
            legendVisible={legendVisible}
            onToggleLegend={() => setLegendVisible(v => !v)}
          />

          <Box sx={{ height: empHeight ?? '50%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <EmployeePanel
              dateStrip={filteredDateStrip}
              employees={empData.employees || []}
              loading={loadingEmp}
              globalSearch={globalSearch}
              searchMode={searchMode}
              onCellClick={(emp, date, rect) => setDetailCtx(makeCtx(rect, { type: 'employee', emp, date: new Date(date), leaveStatus: emp.cells?.[date]?.leave_status || null }, false))}
              scrollRef={empScrollRef}
              headerScrollRef={headerScrollRef}
              projScrollRef={projScrollRef}
              showAll={showAll}
            />
          </Box>

          <DraggableDivider onResize={handleResize} />

          <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ProjectPanel
              dateStrip={filteredDateStrip}
              projects={projData.projects || []}
              loading={loadingProj}
              globalSearch={globalSearch}
              searchMode={searchMode}
              onCellClick={(proj, date, rect) => setDetailCtx(makeCtx(rect, { type: 'project', project: proj, date: new Date(date) }, true))}
              scrollRef={projScrollRef}
              headerScrollRef={headerScrollRef}
              empScrollRef={empScrollRef}
            />
          </Box>
        </Box>

        <Box sx={{ width: legendVisible ? 220 : 0, flexShrink: 0, height: '100%', transition: 'width 0.3s ease', overflowX: 'hidden', overflowY: legendVisible ? 'auto' : 'hidden', borderLeft: '1px solid #e8eaed' }}>
          <Legend
            showAll={showAll}           onShowAllChange={setShowAll}
            hideWeekends={hideWeekends} onHideWeekendsChange={setHideWeekends}
            empData={empData}
            projData={projData}
            dateStrip={filteredDateStrip}
            filters={exportFilters}
          />
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