import { useState } from 'react'
import type { Screen } from '../App'
import { verifyEmail, resendVerification, setUser, getUser } from '../api'

interface Props {
  onNavigate: (screen: Screen) => void
  onVerified: () => void
  onSkip: () => void
  isMobile?: boolean
}

const accentColor = '#5C8B6E'

export default function EmailVerification({ onNavigate: _onNavigate, onVerified, onSkip, isMobile }: Props) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [resendMsg, setResendMsg] = useState('')

  const pad = isMobile ? '40px 16px' : '60px 24px'

  const handleVerify = async () => {
    if (!token.trim()) { setError('Enter your verification code'); return }
    setLoading(true)
    setError('')
    try {
      await verifyEmail(token.trim().toUpperCase())
      // Update cached user
      const user = getUser()
      if (user) setUser({ ...user, email_verified: true })
      onVerified()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setResendMsg('')
    setError('')
    try {
      await resendVerification()
      setResendMsg('A new code has been sent to your email.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAF7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: pad }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: '#EDF3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: 8 }}>
          Verify your email
        </h1>
        <p style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 28, lineHeight: 1.6 }}>
          We sent a 6-character code to your email address. Enter it below to activate your account.
        </p>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          {error && (
            <div style={{ backgroundColor: '#FBF0EE', color: '#C4704F', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}
          {resendMsg && (
            <div style={{ backgroundColor: '#EDF3EF', color: '#5C8B6E', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {resendMsg}
            </div>
          )}
          <input
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase().slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            placeholder="ABC123"
            maxLength={6}
            style={{
              width: '100%', padding: '14px', borderRadius: 8, border: '1px solid #E8E8E4',
              backgroundColor: '#FAFAF7', fontSize: 22, fontWeight: 700, color: '#1A1A1A',
              textAlign: 'center', letterSpacing: '0.15em', outline: 'none', boxSizing: 'border-box',
              marginBottom: 14,
            }}
          />
          <button
            onClick={handleVerify}
            disabled={loading}
            style={{ width: '100%', backgroundColor: loading ? '#ABABAB' : accentColor, color: 'white', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </div>

        <div style={{ fontSize: 13, color: '#6B6B6B' }}>
          Didn't receive a code?{' '}
          <span
            onClick={!resending ? handleResend : undefined}
            style={{ color: accentColor, fontWeight: 600, cursor: resending ? 'not-allowed' : 'pointer' }}
          >
            {resending ? 'Sending...' : 'Resend'}
          </span>
        </div>

        <button
          onClick={onSkip}
          style={{ background: 'none', border: 'none', color: '#ABABAB', fontSize: 12, cursor: 'pointer', marginTop: 20 }}
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
