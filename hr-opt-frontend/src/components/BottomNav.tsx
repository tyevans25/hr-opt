import type { Screen } from '../App'

interface Props {
  currentScreen: Screen
  onNavigate: (screen: Screen) => void
  role?: 'employer' | 'candidate'
}

const employerTabs = [
  {
    id: 'dashboard' as Screen,
    label: 'Home',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity=".9" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity=".9" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity=".9" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity=".9" />
      </svg>
    ),
  },
  {
    id: 'create-job' as Screen,
    label: 'Post Job',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 6.5v7M6.5 10h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'candidates' as Screen,
    label: 'Candidates',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
]

const candidateTabs = [
  {
    id: 'job-browser' as Screen,
    label: 'Jobs',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="16" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="2" y="8" width="16" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="2" y="14" width="16" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    id: 'resume-upload' as Screen,
    label: 'Resume',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 14V5M6 8l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 16h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'interview-room' as Screen,
    label: 'Interview',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M14 8.5l4-2v5l-4-2V8.5z" fill="currentColor" opacity=".8" />
      </svg>
    ),
  },
]

const activeColors: Record<string, string> = {
  dashboard: '#4A6FA5',
  'create-job': '#5C8B6E',
  candidates: '#4A6FA5',
  'job-browser': '#5C8B6E',
  'resume-upload': '#5C8B6E',
  'interview-room': '#C4704F',
}

export default function BottomNav({ currentScreen, onNavigate, role = 'employer' }: Props) {
  const tabs = role === 'employer' ? employerTabs : candidateTabs

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 64, backgroundColor: '#FFFFFF', borderTop: '1px solid #E8E8E4', display: 'flex', alignItems: 'center', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -4px 16px rgba(0,0,0,0.06)' }}>
      {tabs.map((tab) => {
        const active = currentScreen === tab.id
        const color = active ? (activeColors[tab.id] ?? '#4A6FA5') : '#ABABAB'
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', background: 'none', cursor: 'pointer', color, transition: 'color 0.15s', padding: '8px 4px' }}
          >
            {tab.icon}
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, letterSpacing: '0.02em', fontFamily: 'inherit' }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
