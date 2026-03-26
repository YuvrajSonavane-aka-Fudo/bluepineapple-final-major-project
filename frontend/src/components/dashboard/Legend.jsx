// src/components/dashboard/Legend.jsx
import { Box, Typography, Switch, Divider, Button, CircularProgress } from '@mui/material';
import { useState } from 'react';
import { exportDashboardToExcel } from './ExportToExcel';

const LEAVE_TYPES = [
  { label: 'Paid Leave',   color: '#2563EB' },
  { label: 'Unpaid Leave', color: '#93C5FD' },
  { label: 'WFH',          color: '#59be68' },
];
const DAY_PORTION = [
  { label: 'Full Day',    type: 'block' },
  { label: 'Half Day AM', type: 'half-am' },
  { label: 'Half Day PM', type: 'half-pm' },
];
const STATUSES = [
  { label: 'Approved',         type: 'check' },
  { label: 'Pending Approval', type: 'pending' },
  { label: 'Rejected / Cancelled',         type: 'rejected' },
];
const TIMELINE = [
  { label: 'Today',          type: 'today' },
  { label: 'Weekend',        type: 'weekend' },
  { label: 'Public Holiday', type: 'holiday' },
];
const RISK_LEVELS = [
  { label: 'Low Risk',    bg: 'rgba(34,197,94,0.30)',  border: 'rgba(34,197,94,0.5)'  },
  { label: 'Medium Risk', bg: 'rgba(245,158,11,0.55)', border: 'rgba(245,158,11,0.7)' },
  { label: 'High Risk',   bg: 'rgba(239,68,68,0.80)',  border: 'rgba(239,68,68,0.9)'  },
];

const sectionTitle = { fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', pt: 1.25, pb: 1, m: 0 };
const labelSx = { fontSize: 12, color: '#4B5563' };
const swatchBase = { width: 20, height: 16, borderRadius: '3px', flexShrink: 0 };

function Swatch({ item }) {
  const { type } = item;

  // Day portion swatches
  if (type === 'block') {
    return <Box sx={{ ...swatchBase, background: '#2563EB' }} />;
  }
  if (type === 'half-am') {
    return (
      <Box sx={{ ...swatchBase, border: '1px solid #e5e7eb', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', inset: 0, background: '#2563EB', clipPath: 'polygon(0 0,100% 0,0 100%)' }} />
      </Box>
    );
  }
  if (type === 'half-pm') {
    return (
      <Box sx={{ ...swatchBase, border: '1px solid #e5e7eb', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', inset: 0, background: '#2563EB', clipPath: 'polygon(100% 0,100% 100%,0 100%)' }} />
      </Box>
    );
  }

  // Status swatches — consistent with LeaveCell and DetailPanel StatusIcon
  if (type === 'check') {
    return (
      <Box sx={{ ...swatchBase,  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
      </Box>
    );
  }
  // Pending: dotted border overlay 
  if (type === 'pending') {
  return (
    <Box sx={{ ...swatchBase, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',}}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v9" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="12" cy="18" r="1.5" fill="#F59E0B"/>
      </svg>
    </Box>
  );
}
  // Rejected: leave colour fill + red cross overlay (matches LeaveCell rejected style)
  if (type === 'rejected') {
    return (
      <Box sx={{ ...swatchBase,  position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </Box>
    );
  }

  // Timeline swatches
  if (type === 'today')   return <Box sx={{ ...swatchBase, border: '2px solid #994545' }} />;
  if (type === 'weekend') return <Box sx={{ ...swatchBase, background: 'repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 2px,#f3f4f6 2px,#f3f4f6 5px)' }} />;
  if (type === 'holiday') return <Box sx={{ ...swatchBase, background: '#FEFCE8', border: '1px solid #FDE68A' }} />;

  return null;
}

function Section({ title, children }) {
  return (
    <Box sx={{ px: 1.75, pb: 1.75 }}>
      <Typography component="p" sx={sectionTitle}>{title}</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>{children}</Box>
    </Box>
  );
}

export default function Legend({
  showAll, onShowAllChange,
  hideWeekends, onHideWeekendsChange,
  // export props passed from Dashboard
  empData, projData, dateStrip, filters,
}) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);
    try {
      exportDashboardToExcel({ empData, projData, dateStrip, filters });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box
      sx={{
        width: { xs: '100%', md: 220 },
        minWidth: { xs: '100%', md: 220 },
        maxWidth: '100%',
        background: '#fff',
        borderLeft: { xs: 'none', md: '1px solid #e5e7eb' },
        py: 1.5
      }}
    >

      {/* Filters + Export */}
      <Box sx={{ px: 1.75, pb: 1.75, borderBottom: '1px solid #e5e7eb' }}>
        <Typography component="p" sx={sectionTitle}>FILTERS</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {[
            { label: 'All Employees', val: showAll,      fn: () => onShowAllChange(!showAll) },
            { label: 'Hide Weekends', val: hideWeekends, fn: () => onHideWeekendsChange(!hideWeekends) },
          ].map(({ label, val, fn }) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={labelSx}>{label}</Typography>
              <Switch
                checked={val}
                onChange={fn}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#3b82f6' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#3b82f6' },
                  '& .MuiSwitch-track': { backgroundColor: '#d1d5db' },
                }}
              />
            </Box>
          ))}

          {/* Export button */}
          <Button
            onClick={handleExport}
            disabled={exporting}
            fullWidth
            size="small"
            variant="contained"
            startIcon={
              exporting
                ? <CircularProgress size={12} sx={{ color: '#fff' }} />
                : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                )
            }
            sx={{
              mt: 0.5,
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'none',
              background: '#2563EB',
              borderRadius: '6px',
              boxShadow: 'none',
              py: 0.6,
              '&:hover': { background: '#1d4ed8', boxShadow: 'none' },
              '&:disabled': { background: '#93c5fd', color: '#fff' },
            }}
          >
            {exporting ? 'Exporting…' : 'Export to Excel'}
          </Button>
        </Box>
      </Box>

      <Section title="LEAVE TYPES">
        {LEAVE_TYPES.map(item => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ ...swatchBase, background: item.color }} />
            <Typography sx={labelSx}>{item.label}</Typography>
          </Box>
        ))}
      </Section>
      <Divider sx={{ borderColor: '#f3f4f6' }} />

      <Section title="DAY PORTION">
        {DAY_PORTION.map(item => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Swatch item={item} />
            <Typography sx={labelSx}>{item.label}</Typography>
          </Box>
        ))}
      </Section>
      <Divider sx={{ borderColor: '#f3f4f6' }} />

      <Section title="LEAVE STATUS">
        {STATUSES.map(item => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Swatch item={item} />
            <Typography sx={labelSx}>{item.label}</Typography>
          </Box>
        ))}
      </Section>
      <Divider sx={{ borderColor: '#f3f4f6' }} />

      <Section title="TIMELINE">
        {TIMELINE.map(item => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Swatch item={item} />
            <Typography sx={labelSx}>{item.label}</Typography>
          </Box>
        ))}
      </Section>
      <Divider sx={{ borderColor: '#f3f4f6' }} />

      <Section title="RISK LEVELS">
        {RISK_LEVELS.map(item => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 16, borderRadius: '4px', background: item.bg, border: `1px solid ${item.border}`, flexShrink: 0 }} />
            <Typography sx={labelSx}>{item.label}</Typography>
          </Box>
        ))}
      </Section>
    </Box>
  );
}