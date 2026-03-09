// src/components/dashboard/Legend.jsx
// Right sidebar legend matching mock Image 2 exactly

const LEAVE_TYPES = [
  { label: 'Paid Leave',    color: '#A7C7E7', type: 'block' },
  { label: 'Unpaid Leave',  color: '#FFFAA0', type: 'block' },
  { label: 'WFH',           color: '#16a34a', type: 'dot' },
  { label: 'Half Day AM',   color: '#A7C7E7', type: 'half-am' },
  { label: 'Half Day PM',   color: '#A7C7E7', type: 'half-pm' },
];

const STATUSES = [
  { label: 'Approved',         color: '#A7C7E7', type: 'block' },
  { label: 'Pending Approval', color: '#9aa0ad', type: 'dashed' },
  { label: 'Rejected',         color: '#dc2626', type: 'x' },
];

const TIMELINE = [
  { label: 'Current Day',    type: 'today' },
  { label: 'Weekend Pattern', type: 'weekend' },
  { label: 'Public Holiday',  type: 'holiday' },
];

const RISK_LEVELS = [
  { label: 'Low Risk (>75%)',   color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  { label: 'Medium Risk (40-75%)', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { label: 'High Risk (<40%)', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
];

export default function Legend() {
  return (
    <div style={s.root}>
      <Section title="LEAVE TYPES">
        {LEAVE_TYPES.map(item => (
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
            <div style={{
              width: 32, height: 18, borderRadius: 4,
              background: item.bg,
              border: `1px solid ${item.border}`,
              flexShrink: 0,
            }} />
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
  const { color, type } = item;

  if (type === 'block') {
    return <div style={{ width: 20, height: 16, borderRadius: 3, background: color, flexShrink: 0 }} />;
  }
  if (type === 'dot') {
    return (
      <div style={{ width: 20, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      </div>
    );
  }
  if (type === 'dashed') {
    return <div style={{ width: 20, height: 16, borderRadius: 3, border: `2px dashed ${color}`, flexShrink: 0 }} />;
  }
  if (type === 'x') {
    return (
      <div style={{ width: 20, height: 16, borderRadius: 3, background: '#fff1f2', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </div>
    );
  }
  if (type === 'half-am') {
    return (
      <div style={{ width: 20, height: 16, borderRadius: 3, overflow: 'hidden', position: 'relative', border: '1px solid #e8eaed', flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: color, clipPath: 'polygon(0 0,100% 0,0 100%)' }} />
      </div>
    );
  }
  if (type === 'half-pm') {
    return (
      <div style={{ width: 20, height: 16, borderRadius: 3, overflow: 'hidden', position: 'relative', border: '1px solid #e8eaed', flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: color, clipPath: 'polygon(100% 0,100% 100%,0 100%)' }} />
      </div>
    );
  }
  if (type === 'today') {
    return <div style={{ width: 20, height: 16, borderRadius: 3, background: '#fff8f0', border: '2px solid #e85d26', flexShrink: 0 }} />;
  }
  if (type === 'weekend') {
    return (
      <div style={{
        width: 20, height: 16, borderRadius: 3, flexShrink: 0,
        background: 'repeating-linear-gradient(45deg,#f0f2f5,#f0f2f5 2px,#e8eaed 2px,#e8eaed 5px)',
      }} />
    );
  }
  if (type === 'holiday') {
    return (
      <div style={{
        width: 20, height: 16, borderRadius: 3, flexShrink: 0,
        background: '#fef9e7', border: '1px solid #fde68a',
      }} />
    );
  }
  return null;
}

const s = {
  root: {
    width: 200,
    minWidth: 200,
    background: '#ffffff',
    borderLeft: '1px solid #e8eaed',
    overflowY: 'auto',
    padding: '12px 0',
    flexShrink: 0,
  },
  section: {
    padding: '0 14px 14px',
    borderBottom: '1px solid #f0f2f5',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 10, fontWeight: 700, color: '#9aa0ad',
    letterSpacing: '0.6px', textTransform: 'uppercase',
    padding: '10px 0 8px',
  },
  sectionBody: { display: 'flex', flexDirection: 'column', gap: 7 },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  riskRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  label: { fontSize: 12, color: '#5a6272' },
};
