import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Box, TextField, Button, Typography, CircularProgress, useMediaQuery } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

export default function LoginPage() {
  const { login } = useAuth();
  const isMobile = useMediaQuery('(max-width:768px)');
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

  const fadeUp = (delay = 0) => ({
    animation: `fadeUp 0.6s ease ${delay}s forwards`,
    opacity: 0,
    '@keyframes fadeUp': {
      from: { opacity: 0, transform: 'translateY(20px)' },
      to:   { opacity: 1, transform: 'translateY(0)' },
    },
  });

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      width: '100vw', height: '100vh', overflow: isMobile ? 'auto' : 'hidden',
      background: '#0d1425', position: 'relative',
    }}>

      {/* Grid background */}
      <Box sx={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* Glow orbs */}
      <Box sx={{ position: 'absolute', top: '-10%', left: '15%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,91,219,0.15) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: '-10%', right: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,179,237,0.08) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />

      {/* LEFT PANEL — hidden on mobile */}
      {!isMobile && (
        <Box sx={{ flex: '0 0 48%', height: '100vh', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 8 }}>
          <Box sx={{ maxWidth: 460, width: '100%', display: 'flex', flexDirection: 'column', gap: 4.5 }}>

            {/* Brand */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ...fadeUp(0) }}>
              <Box sx={{ width: 40, height: 40, background: 'linear-gradient(135deg, #3b5bdb, #63b3ed)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(59,91,219,0.5)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="3"  y="3"  width="8" height="8" rx="2" fill="white"/>
                  <rect x="13" y="3"  width="8" height="8" rx="2" fill="white" opacity="0.6"/>
                  <rect x="3"  y="13" width="8" height="8" rx="2" fill="white" opacity="0.6"/>
                  <rect x="13" y="13" width="8" height="8" rx="2" fill="white" opacity="0.85"/>
                </svg>
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#e8edf5', letterSpacing: '-0.3px' }}>Leave Impact Dashboard</Typography>
            </Box>

            {/* Headline */}
            <Box sx={fadeUp(0.1)}>
              <Typography sx={{ fontSize: 46, fontWeight: 800, color: '#ffffff', letterSpacing: '-1.5px', lineHeight: 1.08, mb: 2 }}>
                Know your team's{' '}
                <Box component="span" sx={{ background: 'linear-gradient(90deg, #63b3ed 0%, #3b5bdb 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  availability.
                </Box>
              </Typography>
              <Typography sx={{ fontSize: 15, color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, maxWidth: 360 }}>
                Real-time leave impact monitoring and workforce risk forecasting for enterprise teams.
              </Typography>
            </Box>

            {/* Stat cards */}
            <Box sx={{ display: 'flex', gap: 1.5, ...fadeUp(0.2) }}>
              {[
                { val: 'Real-time', label: 'Leave tracking' },
                { val: 'Per-project', label: 'Risk analysis' },
                { val: 'Role-based', label: 'Access control' },
              ].map(({ val, label }) => (
                <Box key={label} sx={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', p: '14px 16px' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#63b3ed', mb: 0.3 }}>{val}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{label}</Typography>
                </Box>
              ))}
            </Box>

            {/* Dashboard preview */}
            <Box sx={fadeUp(0.3)}>
              <Box sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Box sx={{ width: 80, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }} />
                  <Box sx={{ width: 50, height: 5, borderRadius: 99, background: 'rgba(99,179,237,0.25)' }} />
                  <Box sx={{ ml: 'auto', width: 40, height: 5, borderRadius: 99, background: 'rgba(59,91,219,0.3)' }} />
                </Box>
                {[
                  { w: '40%', cells: [1,1,0,1,1,0,0,1,1,0,1], color: 'rgba(59,91,219,0.65)' },
                  { w: '54%', cells: [0,1,1,1,0,0,1,0,1,1,0], color: 'rgba(99,179,237,0.55)' },
                  { w: '35%', cells: [1,0,0,1,1,1,0,1,0,0,1], color: 'rgba(89,190,104,0.55)' },
                  { w: '50%', cells: [0,0,1,0,1,1,1,0,0,1,1], color: 'rgba(59,91,219,0.45)' },
                ].map((row, ri) => (
                  <Box key={ri} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: ri < 3 ? 1 : 0 }}>
                    <Box sx={{ width: row.w, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
                    <Box sx={{ display: 'flex', gap: '2px', ml: 'auto' }}>
                      {row.cells.map((filled, ci) => (
                        <Box key={ci} sx={{ width: 16, height: 22, borderRadius: '3px', background: filled ? row.color : 'rgba(255,255,255,0.04)' }} />
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* RIGHT PANEL — Mobile full screen */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: isMobile ? 3 : 6,
        zIndex: 1,
        minHeight: isMobile ? '100vh' : 'unset',
      }}>
        <Box sx={{ width: '100%', maxWidth: isMobile ? '100%' : 500, ...fadeUp(0.15) }}>

          {/* Mobile-only brand header */}
          {isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 4 }}>
              <Box sx={{ width: 36, height: 36, background: 'linear-gradient(135deg, #3b5bdb, #63b3ed)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(59,91,219,0.5)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3"  y="3"  width="8" height="8" rx="2" fill="white"/>
                  <rect x="13" y="3"  width="8" height="8" rx="2" fill="white" opacity="0.6"/>
                  <rect x="3"  y="13" width="8" height="8" rx="2" fill="white" opacity="0.6"/>
                  <rect x="13" y="13" width="8" height="8" rx="2" fill="white" opacity="0.85"/>
                </svg>
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#e8edf5', letterSpacing: '-0.3px' }}>
                Leave Impact Dashboard
              </Typography>
            </Box>
          )}

          {/* Glass card */}
          <Box sx={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: isMobile ? '18px' : '22px',
            p: isMobile ? '32px 24px' : '50px 45px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}>
            <Typography sx={{ fontSize: isMobile ? 24 : 28, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.6px', mb: 0.75 }}>
              Welcome back
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', mb: 3.5, lineHeight: 1.55 }}>
              Sign in with your corporate email to continue.
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Typography component="label" htmlFor="email-input" sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.4px' }}>
                  Corporate Email
                </Typography>
                <TextField
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  autoFocus
                  fullWidth
                  size="small"
                  // Hide MUI's own label entirely — we render it ourselves above
                  InputLabelProps={{ shrink: false, sx: { display: 'none' } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      fontSize: 14,
                      background: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.22)' },
                      '&.Mui-focused fieldset': { borderColor: '#3b5bdb', borderWidth: '1.5px' },
                    },
                    // Placeholder color
                    '& input::placeholder': { color: 'rgba(255,255,255,0.22)', opacity: 1 },
                    '& input': { color: '#fff' },
                  }}
                />
              </Box>

              {error && (
                <Box sx={{ p: '10px 12px', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '8px', color: '#fca5a5', fontSize: 13 }}>
                  {error}
                </Box>
              )}
              <Button
                type="submit"
                disabled={loading}
                fullWidth
                variant="contained"
                sx={{
                  mt: 0.5,
                  py: 1.25,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #3b5bdb 0%, #63b3ed 100%)',
                  fontSize: 14, fontWeight: 700, textTransform: 'none', letterSpacing: '-0.1px',
                  boxShadow: '0 4px 20px rgba(59,91,219,0.45)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #3451c7 0%, #4fa8d5 100%)',
                    boxShadow: '0 8px 28px rgba(59,91,219,0.6)',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': { transform: 'translateY(0)' },
                  '&.Mui-disabled': { background: 'rgba(59,91,219,0.3)', color: 'rgba(255,255,255,0.4)', boxShadow: 'none' },
                }}
              >
                {loading ? <CircularProgress size={16} sx={{ color: 'rgba(255,255,255,0.6)' }} /> : 'Sign In →'}
              </Button>
            </Box>

            <Box sx={{ mt: 3.5, pt: 3, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
              <LockIcon sx={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }} />
              <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                Secure Corporate Access
              </Typography>
            </Box>
          </Box>

          <Typography sx={{ mt: 2, fontSize: 11.5, color: 'rgba(255,255,255,0.18)', textAlign: 'center', lineHeight: 1.6 }}>
            Access permissions are applied automatically based on your role.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}