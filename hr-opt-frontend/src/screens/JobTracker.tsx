import { useEffect, useState } from 'react'
import type { Screen } from '../App'
import { Card } from '../components/shared'
import { getCandidateApplications } from '../api'

interface Props {
  onNavigate: (screen: Screen) => void
  onStartInterview: (jobId: string) => void
  isMobile?: boolean
  candidateId: string | null
}

const statusColors: Record<string, { bg: string; color: string }> = {
  new: { bg: '#EBF0F8', color: '#4A6FA5' },
  reviewed: { bg: '#EDF3EF', color: '#5C8B6E' },
  interview: { bg: '#E8F4FD', color: '#2E86AB' },
  rejected: { bg: '#FBF0EE', color: '#C4704F' },
}

const statusLabels: Record<string, string> = {
  new: 'Application Received',
  reviewed: 'Under Review',
  interview: 'Interview Stage',
  rejected: 'Not Moving Forward',
}

export default function JobTracker({ onNavigate, onStartInterview, isMobile, candidateId }: Props) {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const pad = isMobile ? '20px 16px' : '32px 36px'

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      // Wait briefly for session restore
      await new Promise((r) => setTimeout(r, 600))
      if (cancelled) return
      if (!candidateId) {
        setLoading(false)
        return
      }
      try {
        const data = await getCandidateApplications(candidateId)
        if (!cancelled) setApplications(data.applications || [])
      } catch (err: any) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [candidateId])

  const active = applications.filter((a) => a.status !== 'rejected')
  const rejected = applications.filter((a) => a.status === 'rejected')

  const renderContent = () => {
    if (loading) {
      return (
        <Card style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>Loading your applications...</p>
        </Card>
      )
    }
    if (error) {
      return (
        <Card style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#C4704F', fontSize: 14 }}>{error}</p>
        </Card>
      )
    }
    if (!candidateId) {
      return (
        <Card style={{ padding: '48px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📄</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>No profile yet</h2>
          <p style={{ color: '#6B6B6B', fontSize: 14, marginBottom: 24 }}>
            Upload your resume to create a profile and start applying.
          </p>
          <button
            onClick={() => onNavigate('resume-upload')}
            style={{ backgroundColor: '#5C8B6E', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Upload Resume
          </button>
        </Card>
      )
    }
    if (applications.length === 0) {
      return (
        <Card style={{ padding: '48px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>No applications yet</h2>
          <p style={{ color: '#6B6B6B', fontSize: 14, marginBottom: 24 }}>
            Browse open roles and apply to get started.
          </p>
          <button
            onClick={() => onNavigate('job-browser')}
            style={{ backgroundColor: '#5C8B6E', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Browse Jobs
          </button>
        </Card>
      )
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {active.length > 0 && (
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#6B6B6B', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
              Active — {active.length}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {active.map((app) => {
                const band = app.score_band
                const bandColor = band?.startsWith('Strong') ? '#5C8B6E' : band?.startsWith('Good') ? '#4A6FA5' : band?.startsWith('Moderate') ? '#B07A2A' : '#C4704F'
                const bandBg = band?.startsWith('Strong') ? '#EDF3EF' : band?.startsWith('Good') ? '#EBF0F8' : band?.startsWith('Moderate') ? '#FFF6E8' : '#FBF0EE'
                return (
                  <Card key={app.application_id} style={{ padding: isMobile ? '16px' : '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 80 }}>
                        {band ? (
                          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, backgroundColor: bandBg, color: bandColor, whiteSpace: 'nowrap' }}>
                            {band}
                          </span>
                        ) : (
                          <>
                            <div style={{ fontSize: 22, fontWeight: 700, color: app.overall_score >= 80 ? '#5C8B6E' : app.overall_score >= 60 ? '#4A6FA5' : '#C4704F' }}>
                              {Math.round(app.overall_score)}
                            </div>
                            <div style={{ fontSize: 10, color: '#ABABAB' }}>/ 100</div>
                          </>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 3 }}>
                          {app.job_title}
                        </div>
                        <div style={{ fontSize: 13, color: '#6B6B6B' }}>
                          {app.company} · {app.location}
                        </div>
                        {app.salary_min && (
                          <div style={{ fontSize: 12, color: '#ABABAB', marginTop: 2 }}>
                            ${app.salary_min.toLocaleString()} – ${app.salary_max?.toLocaleString()}
                          </div>
                        )}

                        {/* Score breakdown bars */}
                        {(app.skill_match_score != null || app.experience_score != null || app.education_score != null) && (
                          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {[
                              { label: 'Skills', value: app.skill_match_score, color: '#5C8B6E' },
                              { label: 'Experience', value: app.experience_score, color: '#7B6FA5' },
                              { label: 'Education', value: app.education_score, color: '#4A6FA5' },
                            ].filter(({ value }) => value != null).map(({ label, value, color }) => (
                              <div key={label}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                  <span style={{ fontSize: 11, color: '#6B6B6B', fontWeight: 500 }}>{label}</span>
                                  <span style={{ fontSize: 11, fontWeight: 700, color }}>{Math.round(value)}</span>
                                </div>
                                <div style={{ height: 5, backgroundColor: '#F0F0EC', borderRadius: 10, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${Math.min(100, Math.round(value))}%`, backgroundColor: color, borderRadius: 10, transition: 'width 0.4s ease' }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Matched / Missing skills pills */}
                        {app.matched_skills?.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#5C8B6E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>Matched Skills</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {app.matched_skills.slice(0, 6).map((s: string, i: number) => (
                                <span key={i} style={{ fontSize: 11, backgroundColor: '#EDF3EF', color: '#5C8B6E', padding: '2px 8px', borderRadius: 20 }}>{s}</span>
                              ))}
                              {app.matched_skills.length > 6 && <span style={{ fontSize: 11, color: '#ABABAB' }}>+{app.matched_skills.length - 6} more</span>}
                            </div>
                          </div>
                        )}
                        {app.missing_skills?.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#C4704F', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>Skills to Develop</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {app.missing_skills.slice(0, 4).map((s: string, i: number) => (
                                <span key={i} style={{ fontSize: 11, backgroundColor: '#FBF0EE', color: '#C4704F', padding: '2px 8px', borderRadius: 20 }}>{s}</span>
                              ))}
                              {app.missing_skills.length > 4 && <span style={{ fontSize: 11, color: '#ABABAB' }}>+{app.missing_skills.length - 4} more</span>}
                            </div>
                          </div>
                        )}

                        {/* Strengths summary — show up to 2 */}
                        {app.strengths?.length > 0 && (
                          <div style={{ marginTop: 10, fontSize: 13, color: '#3A3A3A', lineHeight: 1.5 }}>
                            <span style={{ fontWeight: 600, color: '#5C8B6E' }}>Strengths: </span>
                            {app.strengths.slice(0, 2).join(' · ')}
                            {app.strengths.length > 2 && <span style={{ color: '#ABABAB' }}> +{app.strengths.length - 2} more</span>}
                          </div>
                        )}

                        {/* Gaps — vague category-level only */}
                        {app.gaps?.length > 0 && (
                          <div style={{ marginTop: 6, fontSize: 12, color: '#6B6B6B', lineHeight: 1.5 }}>
                            <span style={{ fontWeight: 600 }}>Areas to strengthen: </span>
                            {app.gaps.slice(0, 2).join(' · ')}
                          </div>
                        )}

                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                            backgroundColor: statusColors[app.status]?.bg,
                            color: statusColors[app.status]?.color,
                          }}>
                            {statusLabels[app.status] || app.status}
                          </span>
                          <span style={{ fontSize: 11, color: '#ABABAB' }}>
                            Applied {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        {app.status === 'interview' && (
                          <button
                            onClick={() => onStartInterview(app.job_id)}
                            style={{
                              marginTop: 14,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 7,
                              backgroundColor: '#2E86AB',
                              border: 'none',
                              borderRadius: 9,
                              color: 'white',
                              fontSize: 13,
                              fontWeight: 700,
                              padding: '9px 18px',
                              cursor: 'pointer',
                              letterSpacing: '0.01em',
                            }}
                          >
                            <span style={{ fontSize: 15 }}>🎥</span> Start Video Interview
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {rejected.length > 0 && (
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#6B6B6B', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
              Not Moving Forward — {rejected.length}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rejected.map((app) => (
                <Card key={app.application_id} style={{ padding: isMobile ? '14px 16px' : '16px 24px', opacity: 0.6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#ABABAB', flexShrink: 0 }}>
                      {Math.round(app.overall_score)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{app.job_title}</div>
                      <div style={{ fontSize: 12, color: '#6B6B6B' }}>{app.company} · {app.location}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, backgroundColor: '#FBF0EE', color: '#C4704F', flexShrink: 0 }}>
                      Not Moving Forward
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: pad, width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: isMobile ? 16 : 28 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em' }}>
          My Applications
        </h1>
        <p style={{ color: '#6B6B6B', marginTop: 4, fontSize: 13 }}>
          {loading ? 'Loading...' : `${applications.length} total · ${active.length} active`}
        </p>
      </div>
      {renderContent()}
    </div>
  )
}
