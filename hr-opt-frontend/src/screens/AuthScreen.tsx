import { useState } from 'react'
import type { Screen } from '../App'
import { signup, login, setToken, setUser } from '../api'

interface Props {
  role: 'employer' | 'candidate'
  onNavigate: (screen: Screen) => void
  onAuth: (user: any) => void
}

const accentColor = (role: string) => role === 'employer' ? '#4A6FA5' : '#5C8B6E'
const accentBg = (role: string) => role === 'employer' ? '#EBF0F8' : '#EDF3EF'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #E8E8E4',
  backgroundColor: '#FAFAF7',
  fontSize: 14,
  color: '#1A1A1A',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function AuthScreen({ role, onNavigate, onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const accent = accentColor(role)
  const bg = accentBg(role)

  const handleSubmit = async () => {
    setError('')
    if (!email || !password) { setError('Email and password required'); return }
    if (mode === 'signup') {
      if (!firstName || !lastName) { setError('First and last name required'); return }
      if (role === 'employer' && (!companyName || !industry)) {
        setError('Company name and industry required')
        return
      }
    }

    setLoading(true)
    try {
      let result
      if (mode === 'signup') {
        result = await signup({
          email,
          password,
          role,
          first_name: firstName,
          last_name: lastName,
          company_name: role === 'employer' ? companyName : undefined,
          industry: role === 'employer' ? industry : undefined,
        })
      } else {
        result = await login(email, password)
        if (result.role !== role) {
          setError(`This account is registered as a ${result.role}, not a ${role}.`)
          setLoading(false)
          return
        }
      }
      setToken(result.token)
      setUser(result)
      onAuth(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAF7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <button
        onClick={() => onNavigate('landing')}
        style={{ position: 'absolute', top: 20, left: 20, background: 'none', border: 'none', color: '#6B6B6B', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        ← Back
      </button>

      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            {role === 'employer' ? (
              <svg width="24" height="24" viewBox="0 0 22 22" fill="none">
                <rect x="2" y="6" width="18" height="14" rx="2" stroke={accent} strokeWidth="1.5" />
                <path d="M7 6V5a4 4 0 018 0v1" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
                <path d="M2 11h18" stroke={accent} strokeWidth="1.5" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="7" r="4" stroke={accent} strokeWidth="1.5" />
                <path d="M3 19c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: 6 }}>
            {mode === 'signup'
              ? role === 'employer' ? 'Create employer account' : 'Create your account'
              : 'Welcome back'}
          </h1>
          <p style={{ fontSize: 13, color: '#6B6B6B' }}>
            {mode === 'signup'
              ? role === 'employer' ? 'Start finding great candidates' : 'Upload your resume after signing up'
              : 'Sign in to continue'}
          </p>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: '28px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ backgroundColor: '#FBF0EE', color: '#C4704F', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}

          {mode === 'signup' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B6B6B', marginBottom: 6 }}>First Name</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B6B6B', marginBottom: 6 }}>Last Name</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" style={inputStyle} />
              </div>
            </div>
          )}

          {mode === 'signup' && role === 'employer' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B6B6B', marginBottom: 6 }}>Company Name</label>
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B6B6B', marginBottom: 6 }}>Industry</label>
                <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Technology, Healthcare" style={inputStyle} />
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B6B6B', marginBottom: 6 }}>Work Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={role === 'employer' ? 'you@company.com' : 'you@example.com'} style={inputStyle} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B6B6B', marginBottom: 6 }}>Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" style={inputStyle} />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ backgroundColor: loading ? '#ABABAB' : accent, color: 'white', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}
          >
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#6B6B6B', marginTop: 4 }}>
            {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
            <span
              onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError('') }}
              style={{ color: accent, fontWeight: 600, cursor: 'pointer' }}
            >
              {mode === 'signup' ? 'Sign in' : 'Sign up'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
