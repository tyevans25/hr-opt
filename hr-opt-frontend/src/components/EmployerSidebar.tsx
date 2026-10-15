import type { Screen } from '../App'

interface Props {
  currentScreen: Screen
  onNavigate: (screen: Screen) => void
  user: any
  onLogout: () => void
}

const navItems = [
  {
    id: 'dashboard' as Screen,
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="1" width="7" height="7" rx="1.5" fill="currentColor" opacity=".9" />
        <rect x="10" y="1" width="7" height="7" rx="1.5" fill="currentColor" opacity=".9" />
        <rect x="1" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity=".9" />
        <rect x="10" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity=".9" />
      </svg>
    ),
  },
  {
    id: 'create-job' as Screen,
    label: 'Post a Job',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 5.5v7M5.5 9h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'candidates' as Screen,
    label: 'Candidates',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

const accent = '#4A6FA5'

export default function EmployerSidebar({ currentScreen, onNavigate, user, onLogout }: Props) {
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
            <div style={{ fontSize: 11, color: '#6B6B6B', marginTop: 1 }}>Employer Portal</div>
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
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: active ? '#EBF0F8' : 'transparent', color: active ? accent : '#6B6B6B', fontWeight: active ? 600 : 400, fontSize: 14, textAlign: 'left', marginBottom: 2 }}
            >
              <span style={{ color: active ? accent : '#ABABAB' }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      <div style={{ padding: '16px 24px', borderTop: '1px solid #E8E8E4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>
            {user?.name?.charAt(0).toUpperCase() || 'E'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Employer'}</div>
            <div style={{ fontSize: 11, color: '#6B6B6B' }}>{user?.company_name || 'HR Manager'}</div>
          </div>
        </div>
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
