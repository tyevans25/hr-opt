import type { Screen } from '../App'

interface Props {
  currentScreen: Screen
  onNavigate: (screen: Screen) => void
  user: any
  onLogout: () => void
}

const navItems = [
  {
    id: 'job-browser' as Screen,
    label: 'Browse Jobs',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="1" width="16" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1" y="7" width="16" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1" y="13" width="16" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'job-tracker' as Screen,
    label: 'My Applications',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 4h12M3 8h8M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="14" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M13 12l.75.75 1.5-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'resume-upload' as Screen,
    label: 'My Resume',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 12V4M5 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'interview-room' as Screen,
    label: 'Interview Room',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M13 7.5l4-2v5l-4-2v-1z" fill="currentColor" opacity=".8" />
      </svg>
    ),
  },
]

const accent = '#5C8B6E'

export default function CandidateSidebar({ currentScreen, onNavigate, user, onLogout }: Props) {
  return (
    <aside style={{ width: 220, minWidth: 220, minHeight: '100vh', position: 'sticky', top: 0, alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRight: '1px solid #E8E8E4', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid #E8E8E4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 12c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="5" r="2.5" stroke="white" strokeWidth="1.5" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', color: '#1A1A1A' }}>HR-Opt</div>
            <div style={{ fontSize: 11, color: '#6B6B6B', marginTop: 1 }}>Candidate Portal</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {navItems.map((item) => {
          const active = currentScreen === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: active ? '#EDF3EF' : 'transparent', color: active ? accent : '#6B6B6B', fontWeight: active ? 600 : 400, fontSize: 14, textAlign: 'left', marginBottom: 2 }}
            >
              <span style={{ color: active ? accent : '#ABABAB' }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      <div style={{ padding: '16px 24px', borderTop: '1px solid #E8E8E4' }}>
        <button
          onClick={() => onNavigate('my-profile')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', borderRadius: 8 }}
          title="View my profile"
        >
          <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>
            {user?.name?.charAt(0).toUpperCase() || 'C'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Candidate'}</div>
            <div style={{ fontSize: 11, color: '#6B6B6B' }}>{user?.email}</div>
          </div>
        </button>
        <button
          onClick={onLogout}
          style={{ width: '100%', padding: '7px', borderRadius: 8, border: '1px solid #E8E8E4', backgroundColor: 'transparent', color: '#6B6B6B', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
