// src/components/auth/LoginPage.jsx
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase());
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.root}>
      {/* LEFT PANEL — illustration */}
      <div style={s.left}>
        <div style={s.leftInner}>
          <div style={s.leftBrand}>
            <div style={s.brandIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="2" fill="white"/>
                <rect x="13" y="3" width="8" height="8" rx="2" fill="white" opacity="0.6"/>
                <rect x="3" y="13" width="8" height="8" rx="2" fill="white" opacity="0.6"/>
                <rect x="13" y="13" width="8" height="8" rx="2" fill="white" opacity="0.8"/>
              </svg>
            </div>
            <span style={s.brandName}>Leave Impact Dashboard</span>
          </div>

          {/* Dashboard illustration card */}
          <div style={s.illustrationWrap}>
            <div style={s.illustrationCard}>
              {/* Mock bar chart */}
              <div style={s.chartHeader}>
                <div style={s.chartLine} />
                <div style={{ ...s.chartLine, width: 80 }} />
              </div>
              <div style={s.chartArea}>
                <div style={s.chartBg}>
                  {[60, 80, 55, 90, 70, 45, 85].map((h, i) => (
                    <div key={i} style={{ ...s.bar, height: `${h}%`, animationDelay: `${i * 80}ms` }} />
                  ))}
                </div>
              </div>
              <div style={s.chartFooter}>
                {['', '', ''].map((_, i) => (
                  <div key={i} style={s.chartFooterLine} />
                ))}
              </div>
              <div style={s.chartCards}>
                <div style={s.chartCard}>
                  <div style={s.chartCardLine} />
                  <div style={s.chartCardTag} />
                </div>
                <div style={s.chartCard}>
                  <div style={s.chartCardLine} />
                  <div style={{ ...s.chartCardTag, width: 48 }} />
                </div>
              </div>
            </div>
          </div>

          <div style={s.leftTagline}>
            <h2 style={s.taglineTitle}>Intelligent Resource Insights</h2>
            <p style={s.taglineSub}>Real-time monitoring and impact forecasting for enterprise teams.</p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — login form */}
      <div style={s.right}>
        <div style={s.formCard} className="slide-up">
          <h1 style={s.formTitle}>Leave Impact Dashboard</h1>
          <p style={s.formSub}>Resource Availability &amp; Leave Impact Monitoring</p>

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Corporate Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                autoFocus
                style={s.input}
              />
            </div>

            {error && <p style={s.error}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{ ...s.submitBtn, opacity: loading ? 0.8 : 1 }}
            >
              {loading ? <Spinner /> : 'Sign In'}
            </button>
          </form>

          <p style={s.footNote}>
            Access permissions are applied automatically based on your role.
          </p>
          <p style={s.secureNote}>
            <LockIcon /> SECURE CORPORATE ACCESS
          </p>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <span style={{
    display: 'inline-block', width: 16, height: 16,
    border: '2px solid rgba(255,255,255,0.4)',
    borderTopColor: '#fff', borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  }} />;
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginRight: 4 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

const s = {
  root: {
    display: 'flex',
    flexDirection: 'row',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: '#eef1f8',
  },
  left: {
    flex: '0 0 52%',
    height: '100vh',
    background: 'linear-gradient(145deg, #e8ecf5 0%, #dce3f0 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    position: 'relative',
  },
  leftInner: {
    maxWidth: 480,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 32,
  },
  leftBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 36, height: 36,
    background: '#1e2d5a',
    borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  brandName: {
    fontWeight: 700, fontSize: 15,
    color: '#1a1f2e', letterSpacing: '-0.2px',
  },
  illustrationWrap: {
    display: 'flex',
    justifyContent: 'center',
  },
  illustrationCard: {
    background: '#ffffff',
    borderRadius: 20,
    padding: '24px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  chartHeader: { display: 'flex', flexDirection: 'column', gap: 6 },
  chartLine: {
    height: 10, width: 120, borderRadius: 99,
    background: '#7b93cc', opacity: 0.8,
  },
  chartArea: {
    background: 'linear-gradient(180deg, #dce3f5 0%, #eef1fa 100%)',
    borderRadius: 10, padding: '16px 16px 4px',
    height: 120,
  },
  chartBg: {
    display: 'flex', alignItems: 'flex-end',
    gap: 6, height: '100%',
  },
  bar: {
    flex: 1, borderRadius: '4px 4px 0 0',
    background: '#1e2d5a',
    animation: 'fadeIn 400ms ease forwards',
    opacity: 0,
  },
  chartFooter: {
    display: 'flex', justifyContent: 'space-between', gap: 8,
  },
  chartFooterLine: {
    flex: 1, height: 8, borderRadius: 99,
    background: '#e0e3e8',
  },
  chartCards: {
    display: 'flex', gap: 12,
  },
  chartCard: {
    flex: 1,
    background: '#f8f9fb',
    borderRadius: 8, padding: '10px 12px',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  chartCardLine: { height: 8, width: '70%', borderRadius: 99, background: '#d4d7dc' },
  chartCardTag: { height: 8, width: 64, borderRadius: 99, background: '#7b93cc' },

  leftTagline: { textAlign: 'center' },
  taglineTitle: {
    fontSize: 20, fontWeight: 700, color: '#1a1f2e',
    letterSpacing: '-0.4px', marginBottom: 8,
  },
  taglineSub: {
    fontSize: 14, color: '#5a6272', lineHeight: 1.6,
  },

  right: {
    flex: 1,
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '550px 40px',
    background: '#eef1f8',
    marginLeft : "250px" ,
  },
  formCard: {
    background: '#ffffff',
    borderRadius: 20,
    padding: '44px 40px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
  },
  formTitle: {
    fontSize: 24, fontWeight: 800,
    color: '#1a1f2e', letterSpacing: '-0.5px',
    marginBottom: 6,
  },
  formSub: {
    fontSize: 13, color: '#5a6272',
    marginBottom: 28, lineHeight: 1.5,
  },
  form: {
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  field: {
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  label: {
    fontSize: 13, fontWeight: 500, color: '#1a1f2e',
  },
  input: {
    padding: '11px 14px',
    border: '1.5px solid #e8eaed',
    borderRadius: 8,
    fontSize: 14,
    color: '#1a1f2e',
    background: '#ffffff',
    transition: 'border-color 150ms',
    width: '100%',
  },
  submitBtn: {
    padding: '13px',
    background: '#1e2d5a',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'opacity 150ms, transform 100ms',
    marginTop: 4,
    letterSpacing: '-0.1px',
  },
  error: {
    padding: '10px 12px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 7,
    color: '#dc2626',
    fontSize: 13,
  },
  footNote: {
    marginTop: 20,
    fontSize: 12,
    color: '#9aa0ad',
    textAlign: 'center',
    lineHeight: 1.6,
  },
  secureNote: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: 600,
    color: '#9aa0ad',
    textAlign: 'center',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
};