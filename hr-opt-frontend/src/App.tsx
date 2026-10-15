import { useState, useEffect } from 'react'
import { getUser, clearToken, getToken, getMe, setUser as saveUser } from './api'

// Screens
import Landing from './screens/Landing'
import AuthScreen from './screens/AuthScreen'
import EmployerDashboard from './screens/EmployerDashboard'
import CreateJobPosting from './screens/CreateJobPosting'
import CandidateList from './screens/CandidateList'
import CandidateProfile from './screens/CandidateProfile'
import ResumeUpload from './screens/ResumeUpload'
import InterviewRoom from './screens/InterviewRoom'
import JobBrowser from './screens/JobBrowser'
import JobTracker from './screens/JobTracker'
import HiringManagerProfile from './screens/HiringManagerProfile'
import EmailVerification from './screens/EmailVerification'

// Nav
import EmployerSidebar from './components/EmployerSidebar'
import CandidateSidebar from './components/CandidateSidebar'
import BottomNav from './components/BottomNav'
import { useBreakpoint } from './hooks/useBreakpoint'

export type Screen =
  | 'landing'
  | 'employer-auth'
  | 'candidate-auth'
  | 'dashboard'
  | 'create-job'
  | 'candidates'
  | 'candidate-profile'
  | 'resume-upload'
  | 'interview-room'
  | 'job-browser'
  | 'job-tracker'
  | 'hiring-manager-profile'
  | 'verify-email'
  | 'my-profile'

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [user, setUser] = useState<any>(null)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [candidateProfileId, setCandidateProfileId] = useState<string | null>(null)
  const [selectedHiringManagerId, setSelectedHiringManagerId] = useState<string | null>(null)
  const isMobile = useBreakpoint(768)

  // Check for existing session on load
  useEffect(() => {
    const token = getToken()
    const savedUser = getUser()
    if (token && savedUser) {
      setUser(savedUser)
      if (savedUser.role === 'candidate' && savedUser.candidate_id) {
        setCandidateProfileId(savedUser.candidate_id)
      }
      setScreen(savedUser.role === 'employer' ? 'dashboard' : 'job-browser')
      // Refresh user from API to pick up candidate_id if it was missing
      getMe().then((fresh) => {
        if (fresh.candidate_id && !savedUser.candidate_id) {
          setCandidateProfileId(fresh.candidate_id)
          const merged = { ...savedUser, candidate_id: fresh.candidate_id }
          setUser(merged)
          saveUser(merged)
        }
      }).catch(() => {})
    }
  }, [])

  const handleAuth = (userData: any) => {
    setUser(userData)
    if (userData.role === 'candidate' && userData.candidate_id) {
      setCandidateProfileId(userData.candidate_id)
    }
    const nextScreen = userData.role === 'employer' ? 'dashboard' : 'job-browser'
    // Prompt email verification after fresh signup
    if (userData.email_verified === false) {
      setScreen('verify-email')
    } else {
      setScreen(nextScreen)
    }
  }

  const handleLogout = () => {
    clearToken()
    setUser(null)
    setScreen('landing')
  }

  // Unauthenticated screens
  if (!user || screen === 'landing' || screen === 'employer-auth' || screen === 'candidate-auth') {
    if (screen === 'employer-auth') {
      return <AuthScreen role="employer" onNavigate={setScreen} onAuth={handleAuth} />
    }
    if (screen === 'candidate-auth') {
      return <AuthScreen role="candidate" onNavigate={setScreen} onAuth={handleAuth} />
    }
    return <Landing onNavigate={setScreen} isMobile={isMobile} />
  }

  const isEmployer = user.role === 'employer'
  const fullscreenScreens: Screen[] = ['resume-upload', 'interview-room', 'verify-email']
  const isFullscreen = fullscreenScreens.includes(screen)

  // Sidebar nav clears the job filter so Candidates shows the full pool
  const handleSidebarNavigate = (s: Screen) => {
    if (s === 'candidates') setSelectedJobId(null)
    setScreen(s)
  }

  const renderScreen = () => {
    // Employer screens
    if (isEmployer) {
      switch (screen) {
        case 'dashboard':
          return (
            <EmployerDashboard
              onNavigate={setScreen}
              isMobile={isMobile}
              employerId={user.linked_id}
              onSelectJob={(jobId) => { setSelectedJobId(jobId); setScreen('candidates') }}
            />
          )
        case 'create-job':
          return <CreateJobPosting onNavigate={setScreen} isMobile={isMobile} employerId={user.linked_id} userId={user.user_id} />
        case 'candidates':
          return (
            <CandidateList
              onNavigate={setScreen}
              isMobile={isMobile}
              employerId={user.linked_id || user.employer_id}
              initialJobFilter={selectedJobId}
              onSelectCandidate={(id, jobId) => { setSelectedCandidateId(id); setSelectedJobId(jobId); setScreen('candidate-profile') }}
            />
          )
        case 'candidate-profile':
          return <CandidateProfile candidateId={selectedCandidateId!} jobId={selectedJobId} onNavigate={setScreen} isMobile={isMobile} />
        default:
          return <EmployerDashboard onNavigate={setScreen} isMobile={isMobile} employerId={user.linked_id} onSelectJob={(jobId) => { setSelectedJobId(jobId); setScreen('candidates') }} />
      }
    }

    // Candidate screens
    switch (screen) {
      case 'job-browser':
        return <JobBrowser onNavigate={setScreen} isMobile={isMobile} candidateId={candidateProfileId} onSelectHiringManager={(id) => { setSelectedHiringManagerId(id); setScreen('hiring-manager-profile') }} />
      case 'job-tracker':
        return <JobTracker onNavigate={setScreen} onStartInterview={(jobId) => { setSelectedJobId(jobId); setScreen('interview-room') }} isMobile={isMobile} candidateId={candidateProfileId} />
      case 'hiring-manager-profile':
        return <HiringManagerProfile userId={selectedHiringManagerId!} onNavigate={setScreen} isMobile={isMobile} />
      case 'resume-upload':
        return (
          <ResumeUpload
            onNavigate={setScreen}
            onCandidateCreated={(id) => { setCandidateProfileId(id); setScreen('job-browser') }}
          />
        )
      case 'interview-room':
        return <InterviewRoom onNavigate={setScreen} isMobile={isMobile} candidateId={candidateProfileId} jobId={selectedJobId} />
      case 'my-profile':
        return <CandidateProfile candidateId={candidateProfileId!} jobId={null} onNavigate={setScreen} isMobile={isMobile} isOwnProfile />
      default:
        return <JobBrowser onNavigate={setScreen} isMobile={isMobile} candidateId={candidateProfileId} />
    }
  }

  if (isFullscreen) {
    if (screen === 'verify-email') {
      const afterVerify = isEmployer ? 'dashboard' : 'job-browser'
      return (
        <EmailVerification
          onNavigate={setScreen}
          onVerified={() => { setUser({ ...user, email_verified: true }); setScreen(afterVerify) }}
          onSkip={() => setScreen(afterVerify)}
          isMobile={isMobile}
        />
      )
    }
    return (
      <div style={{ minHeight: '100vh', backgroundColor: screen === 'interview-room' ? '#1A1A1A' : '#FAFAF7' }}>
        {renderScreen()}
      </div>
    )
  }

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FAFAF7', paddingBottom: 64 }}>
        {!user.email_verified && (
          <div style={{ backgroundColor: '#FFF6E8', borderBottom: '1px solid #F0DEB8', padding: '10px 16px', fontSize: 12, color: '#7A5A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Verify your email to unlock all features.</span>
            <button onClick={() => setScreen('verify-email')} style={{ background: 'none', border: 'none', color: '#B07A2A', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>Verify →</button>
          </div>
        )}
        <main>{renderScreen()}</main>
        <BottomNav currentScreen={screen} onNavigate={handleSidebarNavigate} role={isEmployer ? 'employer' : 'candidate'} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#FAFAF7' }}>
      {isEmployer
        ? <EmployerSidebar currentScreen={screen} onNavigate={handleSidebarNavigate} user={user} onLogout={handleLogout} />
        : <CandidateSidebar currentScreen={screen} onNavigate={setScreen} user={user} onLogout={handleLogout} />
      }
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {!user.email_verified && (
          <div style={{ backgroundColor: '#FFF6E8', borderBottom: '1px solid #F0DEB8', padding: '10px 24px', fontSize: 13, color: '#7A5A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span>Your email is not verified. Verify to post jobs and apply.</span>
            <button onClick={() => setScreen('verify-email')} style={{ background: 'none', border: 'none', color: '#B07A2A', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Verify →</button>
          </div>
        )}
        <div style={{ flex: 1 }}>
          {renderScreen()}
        </div>
      </main>
    </div>
  )
}
