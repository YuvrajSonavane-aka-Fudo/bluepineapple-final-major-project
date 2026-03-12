// src/components/dashboard/Legend.jsx
// Simplified enterprise legend (color = leave type, shape = day portion)

const LEAVE_TYPES = [
  { label: 'Paid Leave', color: '#2563EB' },
  { label: 'Unpaid Leave', color: '#93C5FD' },
  { label: 'WFO', color: '#59be68' },
];

const DAY_PORTION = [
  { label: 'Full Day', type: 'block' },
  { label: 'Half Day AM', type: 'half-am' },
  { label: 'Half Day PM', type: 'half-pm' },
];

const STATUSES = [
  { label: 'Approved', color: '#16A34A', type: 'check' },
  { label: 'Pending Approval', color: '#F59E0B', type: 'dashed' },
  { label: 'Rejected', color: '#DC2626', type: 'x' },
];

const TIMELINE = [
  { label: 'Current Day', type: 'today' },
  { label: 'Weekend', type: 'weekend' },
  { label: 'Public Holiday', type: 'holiday' },
  { label: 'Day has Leave ', type: 'day' },
];

const RISK_LEVELS = [
  { label: 'Low Risk (>75%)', bg: '#b2f5d6', border: '#44ff88' },
  { label: 'Medium Risk (40–75%)', bg: '#ffe2be', border: '#FDBA74' },
  { label: 'High Risk (<40%)', bg: '#ffcdcd', border: '#FCA5A5' },
];

export default function Legend() {
  return (
    <div style={s.root}>
      <Section title="LEAVE TYPES">
        {LEAVE_TYPES.map(item => (
          <div key={item.label} style={s.row}>
            <div style={{ ...s.block, background: item.color }} />
            <span style={s.label}>{item.label}</span>
          </div>
        ))}
      </Section>

      <Section title="DAY PORTION">
        {DAY_PORTION.map(item => (
          <LegendRow key={item.label} item={item} />
        ))}
      </Section>

      <Section title="LEAVE STATUS">
        {STATUSES.map(item => (
          <LegendRow key={item.label} item={item} />
        ))}
      </Section>

      <Section title="TIMELINE">
        {TIMELINE.map(item => (
          <LegendRow key={item.label} item={item} />
        ))}
      </Section>

      <Section title="RISK LEVELS">
        {RISK_LEVELS.map(item => (
          <div key={item.label} style={s.riskRow}>
            <div
              style={{
                width: 32,
                height: 18,
                borderRadius: 4,
                background: item.bg,
                border: `1px solid ${item.border}`,
              }}
            />
            <span style={s.label}>{item.label}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={s.section}>
      <p style={s.sectionTitle}>{title}</p>
      <div style={s.sectionBody}>{children}</div>
    </div>
  );
}

function LegendRow({ item }) {
  return (
    <div style={s.row}>
      <Swatch item={item} />
      <span style={s.label}>{item.label}</span>
    </div>
  );
}

function Swatch({ item }) {
  const { type, color } = item;

  if (type === 'block') {
    return <div style={s.block} />;
  }

  if (type === 'half-am') {
    return (
      <div style={s.half}>
        <div style={{ ...s.triangle, clipPath: 'polygon(0 0,100% 0,0 100%)' }} />
      </div>
    );
  }

  if (type === 'half-pm') {
    return (
      <div style={s.half}>
        <div style={{ ...s.triangle, clipPath: 'polygon(100% 0,100% 100%,0 100%)' }} />
      </div>
    );
  }

  if (type === 'check') {
    return (
      <div style={s.checkBox}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
    );
  }

  if (type === 'dashed') {
    return <div style={{ ...s.block, border: `2px dashed ${color}`, background: 'transparent' }} />;
  }

  if (type === 'x') {
    return (
      <div style={s.rejectBox}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </div>
    );
  }

  if (type === 'today') {
    return <div style={s.today} />;
  }

  if (type === 'weekend') {
    return <div style={s.weekend} />;
  }

  if (type === 'holiday') {
    return <div style={s.holiday} />;
  }

  if (type === 'day') {
    return <div style={s.day} />;
  }

  return null;
}

const s = {
  root: {
    width: 220,
    minWidth: 220,
    background: '#fff',
    borderLeft: '1px solid #e5e7eb',
    overflowY: 'auto',
    padding: '12px 0',
  },

  section: {
    padding: '0 14px 14px',
    borderBottom: '1px solid #f3f4f6',
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#9CA3AF',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '10px 0 8px',
  },

  sectionBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
  },

  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  label: {
    fontSize: 12,
    color: '#4B5563',
  },

  block: {
    width: 20,
    height: 16,
    borderRadius: 3,
    background: '#2563EB',
  },

  half: {
    width: 20,
    height: 16,
    borderRadius: 3,
    border: '1px solid #e5e7eb',
    position: 'relative',
    overflow: 'hidden',
  },

  triangle: {
    position: 'absolute',
    inset: 0,
    background: '#2563EB',
  },

  checkBox: {
    width: 20,
    height: 16,
    borderRadius: 3,
    background: '#ECFDF5',
    border: '1px solid #86EFAC',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rejectBox: {
    width: 20,
    height: 16,
    borderRadius: 3,
    background: '#FEF2F2',
    border: '1px solid #FCA5A5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  today: {
    width: 20,
    height: 16,
    borderRadius: 3,
    border: '2px solid #994545',
  },

  weekend: {
    width: 20,
    height: 16,
    borderRadius: 3,
    background:
      'repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6 2px,#f3f4f6 2px,#f3f4f6 5px)',
  },

  day: {
    width: 20,
    height: 16,
    borderRadius: 3,
    background:'#d5acac',
  },

  holiday: {
    width: 20,
    height: 16,
    borderRadius: 3,
    background: '#FEFCE8',
    border: '1px solid #FDE68A',
  },

  riskRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
};