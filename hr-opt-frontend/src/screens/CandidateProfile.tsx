import { useEffect, useState } from 'react'
import type { Screen } from '../App'
import { Card } from '../components/shared'
import { getCandidate, updateApplicationStatus, getResumeDownloadUrl } from '../api'

interface Props {
  candidateId: string
  jobId?: string | null
  onNavigate: (screen: Screen) => void
  isMobile?: boolean
  isOwnProfile?: boolean
}

const accentColor = '#C4704F'
const avatarColors = ['#4A6FA5', '#5C8B6E', '#C4704F', '#7B6FA5']

const MONTH_MAP: Record<string, string> = {
  jan: 'January', feb: 'February', mar: 'March', apr: 'April',
  may: 'May', jun: 'June', jul: 'July', aug: 'August',
  sep: 'September', sept: 'September', oct: 'October', nov: 'November', dec: 'December',
}

/** Normalise any date string to "Month YYYY" or "Present". */
function formatExpDate(raw: string | null | undefined): string {
  if (!raw) return ''
  const s = raw.trim()
  if (!s) return ''
  if (['present', 'current', 'now', 'ongoing'].includes(s.toLowerCase())) return 'Present'
  // Already "January 2022" style
  const fullMonths = Object.values(MONTH_MAP)
  const parts = s.split(/[\s\-\/,]+/)
  if (parts.length === 2) {
    const [a, b] = parts
    const aLow = a.toLowerCase().replace('.', '')
    if (MONTH_MAP[aLow] && /^\d{4}$/.test(b)) return `${MONTH_MAP[aLow]} ${b}`
    if (fullMonths.includes(a) && /^\d{4}$/.test(b)) return s // already normalised
    if (/^\d{1,2}$/.test(a) && /^\d{4}$/.test(b)) {
      const months = Object.values(MONTH_MAP).filter((v, i, arr) => arr.indexOf(v) === i)
      const idx = parseInt(a) - 1
      return idx >= 0 && idx < 12 ? `${months[idx]} ${b}` : s
    }
  }
  if (/^\d{4}$/.test(s)) return s
  return s
}

const statusColors: Record<string, { bg: string; color: string }> = {
  new: { bg: '#EBF0F8', color: '#4A6FA5' },
  reviewed: { bg: '#EDF3EF', color: '#5C8B6E' },
  interview: { bg: '#E8F4FD', color: '#2E86AB' },
  rejected: { bg: '#FBF0EE', color: '#C4704F' },
}

const recColors: Record<string, { bg: string; color: string }> = {
  'Strong Yes': { bg: '#EDF3EF', color: '#5C8B6E' },
  'Yes': { bg: '#EBF0F8', color: '#4A6FA5' },
  'Maybe': { bg: '#FFF6E8', color: '#B07A2A' },
  'No': { bg: '#FBF0EE', color: '#C4704F' },
}

export default function CandidateProfile({ candidateId, jobId: _jobId, onNavigate, isMobile, isOwnProfile }: Props) {
  const [candidate, setCandidate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [appStatus, setAppStatus] = useState<string>('')
  const pad = isMobile ? '20px 16px' : '28px 32px'

  useEffect(() => {
    if (!candidateId) return
    getCandidate(candidateId, _jobId || undefined)
      .then((data) => {
        setCandidate(data)
        setAppStatus(data.application?.status || '')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [candidateId, _jobId])

  const handleStatusChange = async (status: string) => {
    const appId = candidate?.application?.application_id
    if (!appId) return
    setAppStatus(status)
    await updateApplicationStatus(appId, status).catch(() => {})
  }

  if (loading) return <div style={{ padding: pad }}><p style={{ color: '#6B6B6B' }}>Loading candidate...</p></div>
  if (error || !candidate) return <div style={{ padding: pad }}><p style={{ color: '#C4704F' }}>{error || 'Candidate not found'}</p></div>

  const initials = candidate.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??'
  const avatarBg = avatarColors[0]
  const app = candidate.application

  const gridCols = isMobile || isOwnProfile ? '1fr' : '1fr 1fr'

  const SectionLabel = ({ children, color = '#6B6B6B' }: { children: string; color?: string }) => (
    <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>{children}</div>
  )

  return (
    <div style={{ padding: pad, width: '100%', boxSizing: 'border-box', maxWidth: isOwnProfile ? 760 : undefined }}>

      {/* Back / header */}
      {!isOwnProfile && (
        <button
          onClick={() => onNavigate('candidates')}
          style={{ background: 'none', border: 'none', color: '#6B6B6B', fontSize: 13, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}
        >
          ← Back to Candidates
        </button>
      )}
      {isOwnProfile && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em' }}>My Profile</div>
          <div style={{ fontSize: 13, color: '#6B6B6B', marginTop: 3 }}>This is how employers see you</div>
        </div>
      )}

      {/* Hero card */}
      <Card style={{ padding: isMobile ? '20px 16px' : '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: isMobile ? 52 : 64, height: isMobile ? 52 : 64, borderRadius: '50%', backgroundColor: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 18 : 22, fontWeight: 700, color: 'white', flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em', margin: 0 }}>
                  {candidate.name}
                </h1>
                {app?.recommendation && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, backgroundColor: recColors[app.recommendation]?.bg || '#F5F5F2', color: recColors[app.recommendation]?.color || '#6B6B6B' }}>
                    {app.recommendation}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: '#6B6B6B', marginTop: 4 }}>
                {[candidate.location, candidate.years_of_experience ? `${candidate.years_of_experience} yrs experience` : null].filter(Boolean).join(' · ')}
              </div>
              <div style={{ fontSize: 12, color: '#ABABAB', marginTop: 2 }}>{candidate.email}</div>

              {/* Resume link inline under name */}
              {candidate.resume_filename && (
                <a
                  href={getResumeDownloadUrl(candidate.candidate_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 12, color: '#4A6FA5', textDecoration: 'none', fontWeight: 500 }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  📄 {candidate.resume_filename}
                </a>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {!isOwnProfile && app && (
              <select
                value={appStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                style={{ fontSize: 13, padding: '8px 12px', borderRadius: 8, border: '1px solid #E8E8E4', backgroundColor: statusColors[appStatus]?.bg || '#F5F5F2', color: statusColors[appStatus]?.color || '#6B6B6B', fontWeight: 600, cursor: 'pointer' }}
              >
                <option value="new">Application Received</option>
                <option value="reviewed">Under Review</option>
                <option value="interview">Interview Stage</option>
                <option value="rejected">Not Moving Forward</option>
              </select>
            )}
            {!isOwnProfile && (
              <button
                onClick={() => onNavigate('interview-room')}
                style={{ backgroundColor: accentColor, color: 'white', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Start Interview
              </button>
            )}
            {isOwnProfile && (
              <button
                onClick={() => onNavigate('resume-upload')}
                style={{ backgroundColor: '#5C8B6E', color: 'white', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Update Resume
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Body grid */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: isMobile ? 14 : 20, alignItems: 'start' }}>

        {/* ── Col 1: resume content ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Skills */}
          <Card style={{ padding: '20px' }}>
            <SectionLabel>Skills</SectionLabel>
            {app?.matched_skills?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#5C8B6E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Matched</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {app.matched_skills.map((s: string, i: number) => (
                    <span key={i} style={{ backgroundColor: '#EDF3EF', color: '#5C8B6E', fontSize: 11, padding: '3px 9px', borderRadius: 20 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            {app?.missing_skills?.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#C4704F', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>Missing</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {app.missing_skills.map((s: string, i: number) => (
                    <span key={i} style={{ backgroundColor: '#FBF0EE', color: '#C4704F', fontSize: 11, padding: '3px 9px', borderRadius: 20 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            {!app && (candidate.skills || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(candidate.skills || []).map((s: string, i: number) => (
                  <span key={i} style={{ backgroundColor: '#F0F4FF', color: '#4A6FA5', fontSize: 12, padding: '4px 11px', borderRadius: 20, fontWeight: 500 }}>{s}</span>
                ))}
              </div>
            )}
          </Card>

          {/* Work Experience */}
          <Card style={{ padding: '20px' }}>
            <SectionLabel>Work Experience</SectionLabel>
            {(candidate.work_experience || []).length === 0
              ? <p style={{ fontSize: 13, color: '#ABABAB', margin: 0 }}>No experience listed</p>
              : (candidate.work_experience || []).map((exp: any, i: number) => (
                <div key={i} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: i < candidate.work_experience.length - 1 ? '1px solid #F5F5F2' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{exp.title}</div>
                    {(exp.is_current || exp.end_date === 'Present' || !exp.end_date) && (
                      <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: '#EDF3EF', color: '#5C8B6E', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>Current</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#4A6FA5', marginTop: 2, fontWeight: 500 }}>{exp.company}</div>
                  <div style={{ fontSize: 11, color: '#ABABAB', marginTop: 3 }}>
                    {formatExpDate(exp.start_date)}{exp.end_date
                      ? ` – ${exp.is_current || exp.end_date === 'Present' ? 'Present' : formatExpDate(exp.end_date)}`
                      : exp.is_current ? ' – Present' : ''}
                  </div>
                  {exp.description && (
                    <div style={{ fontSize: 12, color: '#5A5A5A', marginTop: 8, lineHeight: 1.6, backgroundColor: '#FAFAF7', borderRadius: 6, padding: '8px 10px', borderLeft: '2px solid #E8E8E4' }}>
                      {exp.description}
                    </div>
                  )}
                </div>
              ))
            }
          </Card>

          {/* Education */}
          <Card style={{ padding: '20px' }}>
            <SectionLabel>Education</SectionLabel>
            {(candidate.education || []).length === 0
              ? <p style={{ fontSize: 13, color: '#ABABAB', margin: 0 }}>No education listed</p>
              : (candidate.education || []).map((edu: any, i: number) => (
                <div key={i} style={{ marginBottom: i < candidate.education.length - 1 ? 14 : 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{edu.degree}</div>
                  <div style={{ fontSize: 13, color: '#4A6FA5', marginTop: 2, fontWeight: 500 }}>{edu.school}</div>
                  {edu.graduation_year && <div style={{ fontSize: 11, color: '#ABABAB', marginTop: 2 }}>{edu.graduation_year}</div>}
                </div>
              ))
            }
          </Card>

          {/* Preferences */}
          <Card style={{ padding: '20px' }}>
            <SectionLabel>Preferences</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
              {[
                { label: 'Desired Roles', value: (candidate.desired_roles || []).join(', ') || '—' },
                { label: 'Salary', value: candidate.salary_min && candidate.salary_max ? `$${candidate.salary_min.toLocaleString()} – $${candidate.salary_max.toLocaleString()}` : '—' },
                { label: 'Work Style', value: candidate.work_preference ? candidate.work_preference.charAt(0).toUpperCase() + candidate.work_preference.slice(1) : '—' },
                { label: 'Relocation', value: candidate.open_to_relocation ? 'Open to relocating' : 'Not open to relocating' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: '#ABABAB', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                  <div style={{ fontSize: 13, color: '#1A1A1A', marginTop: 3, fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Col 2: match summary (employer view only) ── */}
        {app && !isOwnProfile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Score tiles */}
            <Card style={{ padding: '20px' }}>
              <SectionLabel>Match Summary</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  { label: 'Overall', value: app.overall_score, color: accentColor, detail: app.score_details?.overall },
                  { label: 'Skills', value: app.skill_match_score, color: '#5C8B6E', detail: app.score_details?.skills },
                  { label: 'Experience', value: app.experience_score, color: '#7B6FA5', detail: app.score_details?.experience, sub: (app.relevant_experience_years != null && app.relevant_experience_years < (candidate.years_of_experience ?? Infinity)) ? `${app.relevant_experience_years} yrs relevant` : null },
                ].map(({ label, value, color, detail, sub }: any) => (
                  <div key={label} style={{ backgroundColor: '#FAFAF7', borderRadius: 10, padding: '12px 8px', border: '1px solid #EFEFEB' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color, textAlign: 'center', lineHeight: 1 }}>{Math.round(value)}</div>
                    <div style={{ fontSize: 10, color: '#ABABAB', textAlign: 'center', marginTop: 3, marginBottom: (detail || sub) ? 8 : 0 }}>{label}</div>
                    {sub && <div style={{ fontSize: 11, fontWeight: 600, color, textAlign: 'center', marginBottom: detail ? 6 : 0 }}>{sub}</div>}
                    {detail && <div style={{ fontSize: 11, color: '#5A5A5A', lineHeight: 1.5, borderTop: '1px solid #EFEFEB', paddingTop: 8 }}>{detail}</div>}
                  </div>
                ))}
              </div>
              {app.score_details?.education && (
                <div style={{ backgroundColor: '#FAFAF7', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#5A5A5A', lineHeight: 1.5, border: '1px solid #EFEFEB' }}>
                  <span style={{ fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.05em' }}>Education — </span>
                  {app.score_details.education}
                </div>
              )}
            </Card>

            {app.reasoning && (
              <Card style={{ padding: '20px' }}>
                <SectionLabel>Reasoning</SectionLabel>
                <p style={{ fontSize: 13, color: '#3A3A3A', lineHeight: 1.65, margin: 0 }}>{app.reasoning}</p>
              </Card>
            )}

            {app.strengths?.length > 0 && (
              <Card style={{ padding: '20px' }}>
                <SectionLabel color="#5C8B6E">Strengths</SectionLabel>
                <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {app.strengths.map((s: string, i: number) => (
                    <li key={i} style={{ fontSize: 13, color: '#3A3A3A', lineHeight: 1.5 }}>{s}</li>
                  ))}
                </ul>
              </Card>
            )}

            {app.gaps?.length > 0 && (
              <Card style={{ padding: '20px' }}>
                <SectionLabel color="#C4704F">Gaps</SectionLabel>
                <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {app.gaps.map((g: string, i: number) => (
                    <li key={i} style={{ fontSize: 13, color: '#3A3A3A', lineHeight: 1.5 }}>{g}</li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

