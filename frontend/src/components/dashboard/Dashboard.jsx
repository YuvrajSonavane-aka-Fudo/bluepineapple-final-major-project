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

// Any leave_type from backend NOT in this list is treated as "Other".
const KNOWN_LEAVE_TYPES = ['Paid', 'Unpaid', 'WFH', 'COMP Off', 'AU'];

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

  const containerRef       = useRef(null);
  const empHeightRef       = useRef(null);
  const legendRef          = useRef(null);
  const legendToggleBtnRef = useRef(null);
  const empScrollRef       = useRef(null);
  const projScrollRef      = useRef(null);
  const headerScrollRef    = useRef(null);

  useEffect(() => {
    if (!legendVisible) return;
    const handler = (e) => {
      const clickedInsideLegend = legendRef.current?.contains(e.target);
      const clickedToggleBtn    = legendToggleBtnRef.current?.contains(e.target);
      if (!clickedInsideLegend && !clickedToggleBtn) setLegendVisible(false);
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
      if (!isMobile) document.addEventListener('touchstart', handler);
    }, 300);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [legendVisible, isMobile]);

  const handleResize = useCallback((clientY) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = Math.max(120, Math.min(rect.height - 120, clientY - rect.top));
    empHeightRef.current = px;
    containerRef.current.style.setProperty('--emp-height', `${px}px`);
  }, []);

  useEffect(() => {
    fetchProjects()
      .then(d => setProjects(d.projects || []))
      .catch(err => { if (err?.response?.status === 401) logout(); });
  }, [logout]);

  // leaveTypes and leaveStatuses excluded — all filtering is frontend-only, no refetch.
  const buildBody = useCallback(() => ({
    start_date:     fmt(startDate),
    end_date:       fmt(endDate),
    project_ids:    selectedProjIds,
    leave_types:    [],
    leave_statuses: [],
    is_half_day:    null,
  }), [startDate, endDate, selectedProjIds]);

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

  const { filteredEmployees, filteredProjects } = useMemo(() => {
    const hasOther      = leaveTypes.includes('Other');
    const hasHalfDay    = leaveTypes.includes('Half Day');
    const knownSelected = leaveTypes.filter(t => t !== 'Other' && t !== 'Half Day');

    const hasAnyTypeFilter   = leaveTypes.length > 0;
    const hasAnyStatusFilter = leaveStatuses.length > 0;
    const hasAnyFilter       = hasAnyTypeFilter || hasAnyStatusFilter;
    const q = globalSearch.trim().toLowerCase();

    // A cell passes if it matches ANY selected type condition AND the status filter.
    // "Other" = any leave_type the backend sends that is NOT in KNOWN_LEAVE_TYPES
    // e.g. backend sends leave_type='Sick' → treated as Other.
    const passesTypeFilter = (cell) => {
      if (!hasAnyTypeFilter) return true;
      if (!cell) return false;
      if (knownSelected.includes(cell.leave_type))                       return true;
      if (hasOther && !KNOWN_LEAVE_TYPES.includes(cell.leave_type))      return true;
      if (hasHalfDay && cell.is_half_day === true)                       return true;
      return false;
    };

    const passesStatusFilter = (cell) => {
      if (!hasAnyStatusFilter) return true;
      if (!cell) return false;
      return leaveStatuses.includes(cell.leave_status);
    };

    const passesCell = (cell) => {
      if (!cell) return null;
      return (passesTypeFilter(cell) && passesStatusFilter(cell)) ? cell : null;
    };

    const allEmployees = (empData.employees || []).map(emp => {
      if (!hasAnyFilter) return emp;
      const filteredCells = Object.fromEntries(
        Object.entries(emp.cells || {}).map(([date, cell]) => [date, passesCell(cell)])
      );
      return { ...emp, cells: filteredCells };
    });

    const allProjects = projData.projects || [];

    const activeEmployees = hasAnyFilter
      ? allEmployees.filter(emp => Object.values(emp.cells || {}).some(c => c !== null))
      : allEmployees;

    if (hasAnyFilter && activeEmployees.length === 0) {
      return { filteredEmployees: [], filteredProjects: [] };
    }

    const empCellDates = new Set();
    allEmployees.forEach(emp =>
      Object.entries(emp.cells || {}).forEach(([date, cell]) => {
        if (cell) empCellDates.add(`${emp.user_id}::${date}`);
      })
    );

    const impactedProjects = allProjects.filter(p => {
      if (Object.values(p.cells || {}).some(cell => (cell?.employees_on_leave ?? 0) > 0)) return true;
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

    if (!q) return { filteredEmployees: activeEmployees, filteredProjects: activeProjects };

    const matchedEmps  = activeEmployees.filter(e => e.full_name.toLowerCase().includes(q));
    const matchedProjs = activeProjects.filter(p => p.project_name.toLowerCase().includes(q));

    if (matchedEmps.length === 0 && matchedProjs.length === 0) {
      return { filteredEmployees: [], filteredProjects: [] };
    }

    if (matchedEmps.length > 0 && matchedProjs.length > 0) {
      return { filteredEmployees: matchedEmps, filteredProjects: matchedProjs };
    }

    if (matchedEmps.length > 0) {
      const matchedEmpIds = new Set(matchedEmps.map(e => e.user_id));
      const assignedProjects = activeProjects.filter(p =>
        (p.member_ids || []).some(uid => matchedEmpIds.has(uid))
      );
      return { filteredEmployees: matchedEmps, filteredProjects: assignedProjects };
    }

    const matchedProjIds = new Set(matchedProjs.map(p => p.project_id));
    const assignedEmployees = activeEmployees.filter(e =>
      activeProjects.some(p =>
        matchedProjIds.has(p.project_id) &&
        (p.member_ids || []).includes(e.user_id)
      )
    );
    return { filteredEmployees: assignedEmployees, filteredProjects: matchedProjs };

  }, [globalSearch, empData.employees, projData.projects, leaveTypes, leaveStatuses]);

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

  const employeeCellsByDate = {};
  (empData.employees || []).forEach(emp => {
    Object.entries(emp.cells || {}).forEach(([date, cell]) => {
      if (cell && cell.leave_type !== 'WFH' && cell.leave_status === 'Approved')
        employeeCellsByDate[date] = true;
    });
  });

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

  const sharedHeaderProps = {
    dateStrip: filteredDateStrip,
    projectCells: projectCellsByDate,
    employeeCells: employeeCellsByDate,
    wfhCells: wfhCellsByDate,
    globalSearch,
    onGlobalSearchChange: setGlobalSearch,
    onDateClick: (date, rect) => {
      const info = filteredDateStrip.find(d => d.date === date);
      if (info?.is_weekend) return;
      const hasAnything = employeeCellsByDate[date] || projectCellsByDate[date]
        || wfhCellsByDate[date] || info?.is_public_holiday;
      if (!hasAnything) return;
      setDetailCtx(makeCtx(rect, { type: 'day', date: new Date(date) }, false));
    },
    scrollRef: headerScrollRef,
    empScrollRef,
    projScrollRef,
    legendVisible,
    onToggleLegend: () => setLegendVisible(v => !v),
    legendToggleBtnRef,
    // ── Pass dates so SharedHeader can compute the LC column header ──
    startDate,
    endDate,
  };

  // ─── Mobile layout ───
  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#f0f2f5' }}>
        <MobileToolbar
          {...toolbarProps}
          showAll={showAll} onShowAllChange={setShowAll}
          hideWeekends={hideWeekends} onHideWeekendsChange={setHideWeekends}
          empData={empData} projData={projData}
          dateStrip={filteredDateStrip} exportFilters={exportFilters}
        />

        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#ffffff', alignItems: 'stretch', position: 'relative' }}>
          <Box ref={containerRef} sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            <SharedHeader {...sharedHeaderProps} />

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
                // ── Pass dates so EmployeePanel can show taken/allocated ──
                startDate={startDate}
                endDate={endDate}
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

          {isMobile && (
            <>
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                  <polyline points="2 17 12 22 22 17"/>
                  <polyline points="2 12 12 17 22 12"/>
                </svg>
              </Box>

              {legendVisible && (
                <Box
                  onPointerDown={(e) => { e.stopPropagation(); setLegendVisible(false); }}
                  sx={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.35)' }}
                />
              )}

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
              }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Box
                  onClick={() => setLegendVisible(false)}
                  sx={{ display: 'flex', justifyContent: 'center', pt: 1.25, pb: 0.5, flexShrink: 0, cursor: 'pointer' }}
                >
                  <Box sx={{ width: 40, height: 4, borderRadius: 99, background: '#dde0e6' }} />
                </Box>
                <Box sx={{ px: 2, pb: 1, pt: 0.5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#1a1f2e' }}>Legend & Settings</Typography>
                  <Box component="button" onClick={() => setLegendVisible(false)}
                    sx={{ width: 28, height: 28, borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </Box>
                </Box>
                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                  <Legend
                    showAll={showAll}           onShowAllChange={setShowAll}
                    hideWeekends={hideWeekends} onHideWeekendsChange={setHideWeekends}
                    empData={empData}
                    projData={projData}
                    dateStrip={filteredDateStrip}
                    filters={exportFilters}
                    isMobile={true}
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

  // ─── Desktop layout ───
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#f0f2f5' }}>
      <Toolbar {...toolbarProps} />

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#ffffff', alignItems: 'stretch', position: 'relative' }}>
        <Box
          ref={containerRef}
          sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <SharedHeader {...sharedHeaderProps} />

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
              // ── Pass dates so EmployeePanel can show taken/allocated ──
              startDate={startDate}
              endDate={endDate}
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

        <Box
          ref={legendRef}
          sx={{
            position: 'fixed',
            top: 52,
            right: 0,
            bottom: 0,
            width: 220,
            zIndex: 400,
            background: '#fff',
            borderLeft: '1px solid #e8eaed',
            overflowY: 'auto',
            overflowX: 'hidden',
            transform: legendVisible ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: legendVisible ? '-4px 0 20px rgba(0,0,0,0.08)' : 'none',
          }}
        >
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