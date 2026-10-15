import type { Screen } from '../App'

interface Props {
  onNavigate: (screen: Screen) => void
  isMobile?: boolean
}

export default function Landing({ onNavigate, isMobile }: Props) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAFAF7',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#4A6FA5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M3 12c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="5" r="2.5" stroke="white" strokeWidth="1.5" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', color: '#1A1A1A' }}>HR-Opt</div>
          <div style={{ fontSize: 12, color: '#6B6B6B' }}>AI-Powered Hiring Platform</div>
        </div>
      </div>

      {/* Headline */}
      <div style={{ textAlign: 'center', maxWidth: 560, marginBottom: 48 }}>
        <h1 style={{ fontSize: isMobile ? 28 : 38, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 14 }}>
          Smarter hiring,<br />for everyone
        </h1>
        <p style={{ fontSize: 16, color: '#6B6B6B', lineHeight: 1.6 }}>
          AI-powered resume screening and candidate matching that works for both sides of the table.
        </p>
      </div>

      {/* Role picker */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, width: '100%', maxWidth: 560 }}>
        {/* Employer card */}
        <button
          onClick={() => onNavigate('employer-auth')}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E8E8E4',
            borderRadius: 12,
            padding: '28px 24px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#4A6FA5'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(74,111,165,0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E8E8E4'
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#EBF0F8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="2" y="6" width="18" height="14" rx="2" stroke="#4A6FA5" strokeWidth="1.5" />
              <path d="M7 6V5a4 4 0 018 0v1" stroke="#4A6FA5" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M2 11h18" stroke="#4A6FA5" strokeWidth="1.5" />
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 6 }}>I'm Hiring</div>
          <div style={{ fontSize: 13, color: '#6B6B6B', lineHeight: 1.5 }}>
            Post jobs, screen candidates with AI, and find the best match for your team.
          </div>
          <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: '#4A6FA5', display: 'flex', alignItems: 'center', gap: 4 }}>
            Get started →
          </div>
        </button>

        {/* Candidate card */}
        <button
          onClick={() => onNavigate('candidate-auth')}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E8E8E4',
            borderRadius: 12,
            padding: '28px 24px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#5C8B6E'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(92,139,110,0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E8E8E4'
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#EDF3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="7" r="4" stroke="#5C8B6E" strokeWidth="1.5" />
              <path d="M3 19c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="#5C8B6E" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 6 }}>I'm Job Seeking</div>
          <div style={{ fontSize: 13, color: '#6B6B6B', lineHeight: 1.5 }}>
            Upload your resume, get matched with roles, and track your applications.
          </div>
          <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: '#5C8B6E', display: 'flex', alignItems: 'center', gap: 4 }}>
            Get started →
          </div>
        </button>
      </div>
    </div>
  )
}
