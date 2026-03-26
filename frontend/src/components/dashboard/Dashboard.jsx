// src/components/dashboard/Dashboard.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Typography, useMediaQuery } from '@mui/material';
import { fmt, getWeekRange } from '../../utils/dateUtils';
import { fetchProjects, fetchEmployeeDashboard, fetchProjectDashboard } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Toolbar            from './Toolbar';
import MobileToolbar      from './MobileToolbar';
import EmployeePanel      from './EmployeePanel';
import ProjectPanel       from './ProjectPanel';
import DraggableDivider   from './DraggableDivider';
import DetailPanel        from './DetailPanel';
import Legend             from './Legend';
import SharedHeader       from './SharedHeader';

export default function Dashboard() {
  const { logout } = useAuth();
  const isMobile = useMediaQuery('(max-width:768px)');

  const [startDate, setStartDate] = useState(getWeekRange().start);
  const [endDate,   setEndDate]   = useState(getWeekRange().end);
  const [projects,        setProjects]        = useState([]);
  const [selectedProjIds, setSelectedProjIds] = useState([]);
  const [leaveTypes,      setLeaveTypes]      = useState([]);
  const [leaveStatuses,   setLeaveStatuses]   = useState([]);
  const [showAll,         setShowAll]         = useState(false);
  const [hideWeekends,    setHideWeekends]    = useState(false);
  const [globalSearch,    setGlobalSearch]    = useState('');
  const [empData,         setEmpData]         = useState({ date_strip: [], employees: [] });
  const [projData,        setProjData]        = useState({ date_strip: [], projects: [] });
  const [loadingEmp,      setLoadingEmp]      = useState(false);
  const [loadingProj,     setLoadingProj]     = useState(false);
  const [detailCtx,       setDetailCtx]       = useState(null);
  const [legendVisible,   setLegendVisible]   = useState(false);

  const containerRef = useRef(null);
  const empHeightRef = useRef(null); // px value — written directly to DOM, no setState
  const legendRef = useRef(null);   // ref on the legend panel itself

  const empScrollRef    = useRef(null);
  const projScrollRef   = useRef(null);
  const headerScrollRef = useRef(null);

  //  Close legend when clicking/touching outside of it 
  useEffect(() => {
    if (!legendVisible) return;
    const handler = (e) => {
      if (legendRef.current && !legendRef.current.contains(e.target)) {
        setLegendVisible(false);
      }
    };
    // slight delay so the toggle-button click that opens it doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
      document.addEventListener('touchstart', handler);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [legendVisible]);

  const handleResize = useCallback((clientY) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = Math.max(120, Math.min(rect.height - 120, clientY - rect.top));
    empHeightRef.current = px;
    // Write directly to the DOM — zero React re-renders during drag
    containerRef.current.style.setProperty('--emp-height', `${px}px`);
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
    leave_types:    leaveTypes.filter(t => t !== 'Half Day'),
    leave_statuses: leaveStatuses,
    is_half_day:    leaveTypes.includes('Half Day') && leaveTypes.length === 1 ? true : null,
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

  useEffect(() => {
    setEmpData({ date_strip: [], employees: [] });
    setProjData({ date_strip: [], projects: [] });
    fetchAll();
  }, [fetchAll]);

  const handleClear = () => {
    const r = getWeekRange();
    setStartDate(r.start); setEndDate(r.end);
    setSelectedProjIds([]); setLeaveTypes([]); setLeaveStatuses([]);
    setGlobalSearch(''); setDetailCtx(null);
    setShowAll(false); setHideWeekends(false);
  };

  const filteredDateStrip = useMemo(() =>
    hideWeekends
      ? (empData.date_strip || []).filter(d => !d.is_weekend)
      : (empData.date_strip || []),
    [hideWeekends, empData.date_strip]
  );

  // global search 
  const { filteredEmployees, filteredProjects } = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    const allEmployees = empData.employees || [];
    const allProjects  = projData.projects || [];
    const hasAnyFilter = leaveTypes.length > 0 || leaveStatuses.length > 0;

    // When any filter is active, narrow to only employees with non-null cells
    // (API already returns filtered data, so non-null cell = matches the filter)
    const activeEmployees = hasAnyFilter
      ? allEmployees.filter(emp => Object.values(emp.cells || {}).some(c => c !== null))
      : allEmployees;

    // If filters active and NO employees match → both panels empty
    if (hasAnyFilter && activeEmployees.length === 0) {
      return { filteredEmployees: [], filteredProjects: [] };
    }

    // Default: show projects impacted by real absences OR whose members have WFH/leave cells
    // This ensures WFH-only days still surface impacted projects on initial load
    const empCellDates = new Set();
    allEmployees.forEach(emp =>
      Object.entries(emp.cells || {}).forEach(([date, cell]) => {
        if (cell) empCellDates.add(`${emp.user_id}::${date}`);
      })
    );
    const impactedProjects = allProjects.filter(p => {
      // Has real project-level absence count
      if (Object.values(p.cells || {}).some(cell => (cell?.employees_on_leave ?? 0) > 0)) return true;
      // OR at least one member has any leave/WFH cell in the date range
      return (p.member_ids || []).some(uid =>
        [...empCellDates].some(key => key.startsWith(`${uid}::`))
      );
    });

    const activeProjects = hasAnyFilter
      ? (() => {
          const activeEmpIds = new Set(activeEmployees.map(e => e.user_id));
          return allProjects.filter(p =>
            (p.member_ids || []).some(uid => activeEmpIds.has(uid))
          );
        })()
      : impactedProjects;

    // No search → return filtered results directly
    if (!q) return { filteredEmployees: activeEmployees, filteredProjects: activeProjects };

    const matchedEmps  = activeEmployees.filter(e => e.full_name.toLowerCase().includes(q));
    const matchedProjs = activeProjects.filter(p => p.project_name.toLowerCase().includes(q));

    // Nothing matched → both empty
    if (matchedEmps.length === 0 && matchedProjs.length === 0) {
      return { filteredEmployees: [], filteredProjects: [] };
    }

    // Both matched → each panel shows only its own matches
    if (matchedEmps.length > 0 && matchedProjs.length > 0) {
      return { filteredEmployees: matchedEmps, filteredProjects: matchedProjs };
    }

    // Only employees matched → matched employees + their assigned projects (empty if none)
    if (matchedEmps.length > 0) {
      const matchedEmpIds = new Set(matchedEmps.map(e => e.user_id));
      const assignedProjects = activeProjects.filter(p =>
        (p.member_ids || []).some(uid => matchedEmpIds.has(uid))
      );
      return { filteredEmployees: matchedEmps, filteredProjects: assignedProjects };
    }

    // Only projects matched → matched projects + their assigned employees (empty if none)
    const matchedProjIds = new Set(matchedProjs.map(p => p.project_id));
    const assignedEmployees = activeEmployees.filter(e =>
      activeProjects.some(p =>
        matchedProjIds.has(p.project_id) &&
        (p.member_ids || []).includes(e.user_id)
      )
    );
    return { filteredEmployees: assignedEmployees, filteredProjects: matchedProjs };

  }, [globalSearch, empData.employees, projData.projects, leaveTypes,leaveStatuses]);

  //  Auto-scroll to today on data load 
  useEffect(() => {
    if (!filteredDateStrip.length) return;
    const todayIdx = filteredDateStrip.findIndex(d => {
      const dd = new Date(d.date + 'T12:00:00');
      const now = new Date();
      return dd.getFullYear() === now.getFullYear() && dd.getMonth() === now.getMonth() && dd.getDate() === now.getDate();
    });
    if (todayIdx < 0) return;
    const CELL_W = 35;
    const scrollTo = Math.max(0, todayIdx * CELL_W - 60);
    setTimeout(() => {
      [headerScrollRef, empScrollRef, projScrollRef].forEach(ref => {
        if (ref.current) ref.current.scrollLeft = scrollTo;
      });
    }, 100);
  }, [filteredDateStrip]); 

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

  // employeeCellsByDate: only Approved, non-WFH leaves drive date strip highlight
  // Pending/Rejected leaves are shown in cells but must NOT make a date appear
  // to have impactful leave for date-strip colouring or day-click purposes.
  const employeeCellsByDate = {};
  (empData.employees || []).forEach(emp => {
    Object.entries(emp.cells || {}).forEach(([date, cell]) => {
      if (cell && cell.leave_type !== 'WFH' && cell.leave_status === 'Approved')
        employeeCellsByDate[date] = true;
    });
  });

  // wfhCellsByDate: dates where at least one employee is Approved WFH
  const wfhCellsByDate = {};
  (empData.employees || []).forEach(emp => {
    Object.entries(emp.cells || {}).forEach(([date, cell]) => {
      if (cell && cell.leave_type === 'WFH' && cell.leave_status === 'Approved')
        wfhCellsByDate[date] = true;
    });
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

  const toolbarProps = {
    startDate, endDate,
    onRangeChange: (st, en) => { setStartDate(st); setEndDate(en); },
    projects,
    selectedProjectIds: selectedProjIds, onProjectsChange: setSelectedProjIds,
    leaveTypes, onLeaveTypesChange: setLeaveTypes,
    leaveStatuses, onLeaveStatusesChange: setLeaveStatuses,
    onRefresh: fetchAll, onClear: handleClear,
    loading: loadingEmp || loadingProj,
  };

  //  Mobile layout — same grid as desktop, compact toolbar 
  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#f0f2f5' }}>
        <MobileToolbar {...toolbarProps} />

        {/* Same web grid content */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#ffffff', alignItems: 'stretch', position: 'relative' }}>
          <Box ref={containerRef} sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            <SharedHeader
              dateStrip={filteredDateStrip}
              projectCells={projectCellsByDate}
              employeeCells={employeeCellsByDate}
              wfhCells={wfhCellsByDate}
              globalSearch={globalSearch}
              onGlobalSearchChange={setGlobalSearch}
              onDateClick={(date, rect) => {
                const info = filteredDateStrip.find(d => d.date === date);
                if (info?.is_weekend) return;
                // Block only truly empty days — allow holidays, WFH days, and real leave/risk
                const hasAnything = employeeCellsByDate[date] || projectCellsByDate[date]
                  || wfhCellsByDate[date] || info?.is_public_holiday;
                if (!hasAnything) return;
                setDetailCtx(makeCtx(rect, { type: 'day', date: new Date(date) }, false));
              }}
              scrollRef={headerScrollRef}
              empScrollRef={empScrollRef}
              projScrollRef={projScrollRef}
              legendVisible={legendVisible}
              onToggleLegend={() => setLegendVisible(v => !v)}
            />

            <Box sx={{ height: 'var(--emp-height, 50%)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <EmployeePanel
                dateStrip={filteredDateStrip}
                employees={filteredEmployees}
                loading={loadingEmp}
                globalSearch={globalSearch}
                onCellClick={(emp, date, rect) => setDetailCtx(makeCtx(rect, { type: 'employee', emp, date: new Date(date), leaveStatus: emp.cells?.[date]?.leave_status || null }, false))}
                scrollRef={empScrollRef}
                headerScrollRef={headerScrollRef}
                projScrollRef={projScrollRef}
                showAll={showAll || globalSearch.trim().length > 0} 
              />
            </Box>

            <DraggableDivider onResize={handleResize} />

            <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <ProjectPanel
                dateStrip={filteredDateStrip}
                projects={filteredProjects}
                loading={loadingProj}
                globalSearch={globalSearch}
                onCellClick={(proj, date, rect) => setDetailCtx(makeCtx(rect, { type: 'project', project: proj, date: new Date(date) }, true))}
                scrollRef={projScrollRef}
                headerScrollRef={headerScrollRef}
                empScrollRef={empScrollRef}
              />
            </Box>
          </Box>

          {/*  Mobile Legend: FAB + bottom sheet  */}
          {isMobile && (
            <>
              {/* FAB — bottom right, opens legend sheet */}
              <Box
                component="button"
                onClick={() => setLegendVisible(v => !v)}
                sx={{
                  position: 'fixed', bottom: 24, right: 20, zIndex: 402,
                  width: 48, height: 48, borderRadius: '50%',
                  background: legendVisible ? '#374151' : '#1e2d5a',
                  border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s ease, transform 0.2s ease',
                  transform: legendVisible ? 'rotate(180deg)' : 'rotate(0deg)',
                  '&:active': { transform: legendVisible ? 'rotate(180deg) scale(0.92)' : 'scale(0.92)' },
                }}
              >
                {/* Layers/legend icon */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                  <polyline points="2 17 12 22 22 17"/>
                  <polyline points="2 12 12 17 22 12"/>
                </svg>
              </Box>

              {/* Backdrop */}
              {legendVisible && (
                <Box
                  onClick={() => setLegendVisible(false)}
                  sx={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.35)' }}
                />
              )}

              {/* Bottom sheet */}
              <Box sx={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                zIndex: 401,
                background: '#fff',
                borderRadius: '20px 20px 0 0',
                boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
                height: '75vh',
                display: 'flex', flexDirection: 'column',
                transform: legendVisible ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}>
                {/* Drag handle */}
                <Box
                  onClick={() => setLegendVisible(false)}
                  sx={{ display: 'flex', justifyContent: 'center', pt: 1.25, pb: 0.5, flexShrink: 0, cursor: 'pointer' }}
                >
                  <Box sx={{ width: 40, height: 4, borderRadius: 99, background: '#dde0e6' }} />
                </Box>
                {/* Header */}
                <Box sx={{ px: 2, pb: 1, pt: 0.5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#1a1f2e' }}>Legend & Settings</Typography>
                  <Box component="button" onClick={() => setLegendVisible(false)}
                    sx={{ width: 28, height: 28, borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </Box>
                </Box>
                {/* Scrollable content */}
                <Box sx={{ flex: 1, overflowY: 'auto' }}>
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
            </>
          )}
        </Box>

        <DetailPanel
          context={detailCtx}
          onClose={() => setDetailCtx(null)}
          filters={{ project_ids: selectedProjIds, leave_types: leaveTypes, leave_statuses: leaveStatuses }}
        />
      </Box>
    );
  }

  //  Desktop layout 
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#f0f2f5' }}>
      <Toolbar {...toolbarProps} />

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#ffffff', alignItems: 'stretch', position: 'relative' }}>
        <Box ref={containerRef} sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          <SharedHeader
            dateStrip={filteredDateStrip}
            projectCells={projectCellsByDate}
            employeeCells={employeeCellsByDate}
            wfhCells={wfhCellsByDate}
            globalSearch={globalSearch}
            onGlobalSearchChange={setGlobalSearch}
            onDateClick={(date, rect) => {
              const info = filteredDateStrip.find(d => d.date === date);
              if (info?.is_weekend) return;
              // Block only truly empty days — allow holidays, WFH days, and real leave/risk
              const hasAnything = employeeCellsByDate[date] || projectCellsByDate[date]
                || wfhCellsByDate[date] || info?.is_public_holiday;
              if (!hasAnything) return;
              setDetailCtx(makeCtx(rect, { type: 'day', date: new Date(date) }, false));
            }}
            scrollRef={headerScrollRef}
            empScrollRef={empScrollRef}
            projScrollRef={projScrollRef}
            legendVisible={legendVisible}
            onToggleLegend={() => setLegendVisible(v => !v)}
          />

          <Box sx={{ height: 'var(--emp-height, 50%)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <EmployeePanel
              dateStrip={filteredDateStrip}
              employees={filteredEmployees}
              loading={loadingEmp}
              globalSearch={globalSearch}
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
              projects={filteredProjects}
              loading={loadingProj}
              globalSearch={globalSearch}
              onCellClick={(proj, date, rect) => setDetailCtx(makeCtx(rect, { type: 'project', project: proj, date: new Date(date) }, true))}
              scrollRef={projScrollRef}
              headerScrollRef={headerScrollRef}
              empScrollRef={empScrollRef}
            />
          </Box>
        </Box>

        <Box ref={legendRef} sx={{ width: legendVisible ? 220 : 0, flexShrink: 0, height: '100%', transition: 'width 0.3s ease', overflowX: 'hidden', overflowY: legendVisible ? 'auto' : 'hidden', borderLeft: '1px solid #e8eaed' }}>
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