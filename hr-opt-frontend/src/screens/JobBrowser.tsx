import { useEffect, useRef, useState } from 'react'
import type { Screen } from '../App'
import { Card, JDBody } from '../components/shared'
import { applyToJob } from '../api'

interface Props {
  onNavigate: (screen: Screen) => void
  isMobile?: boolean
  candidateId: string | null
  onSelectHiringManager?: (userId: string) => void
}

const accentColor = '#5C8B6E'


function SkillPills({ skills }: { skills: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const measure = () => {
      // Temporarily show all to measure
      const spans = Array.from(container.querySelectorAll<HTMLElement>('[data-skill]'))
      if (!spans.length) return

      // Reset visibility
      spans.forEach(s => { s.style.display = '' })
      const overflow = container.querySelector<HTMLElement>('[data-overflow]')
      if (overflow) overflow.style.display = 'none'

      const containerRight = container.getBoundingClientRect().right

      // Hide pills from the end until nothing overflows
      spans.forEach(s => { s.style.display = '' })
      if (overflow) overflow.style.display = 'none'

      let visible = spans.length
      while (visible > 0) {
        const last = spans[visible - 1]
        if (last.getBoundingClientRect().right <= containerRight + 2) break
        last.style.display = 'none'
        visible--
      }

      // If we hid any, show the overflow badge and check it fits too
      const hidden = spans.length - visible
      if (hidden > 0 && overflow) {
        overflow.textContent = `+${hidden} more`
        overflow.style.display = ''
        // If overflow badge itself overflows, hide one more pill
        while (visible > 0 && overflow.getBoundingClientRect().right > containerRight + 2) {
          spans[visible - 1].style.display = 'none'
          visible--
          overflow.textContent = `+${spans.length - visible} more`
        }
      }
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(container)
    return () => ro.disconnect()
  }, [skills])

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', flexWrap: 'nowrap', gap: 5, overflow: 'hidden', alignItems: 'center' }}
    >
      {skills.map((s, i) => (
        <span
          key={i}
          data-skill
          style={{ fontSize: 11, backgroundColor: '#F5F5F2', color: '#6B6B6B', padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          {s}
        </span>
      ))}
      <span
        data-overflow
        style={{ fontSize: 11, color: '#ABABAB', whiteSpace: 'nowrap', flexShrink: 0, display: 'none' }}
      />
    </div>
  )
}

export default function JobBrowser({ onNavigate, isMobile, candidateId, onSelectHiringManager }: Props) {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<any | null>(null)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState<Record<string, any>>({})
  const [error, setError] = useState('')
  const pad = isMobile ? '20px 16px' : '32px 36px'

  useEffect(() => {
    fetch('/api/jobs/public')
      .then((r) => r.json())
      .then((data) => setJobs(data.jobs || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleApply = async (jobId: string) => {
    if (!candidateId) {
      onNavigate('resume-upload')
      return
    }
    setApplying(true)
    setError('')
    try {
      const result = await applyToJob(candidateId, jobId)
      setApplied((prev) => ({ ...prev, [jobId]: result }))
      setSelectedJob(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div style={{ padding: pad, width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: isMobile ? 16 : 28 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em' }}>
          Open Roles
        </h1>
        <p style={{ color: '#6B6B6B', marginTop: 4, fontSize: 13 }}>
          {jobs.length} positions available
        </p>
      </div>

      {!candidateId && (
        <div style={{ backgroundColor: '#EDF3EF', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#5C8B6E', marginBottom: 16 }}>
          <span style={{ fontWeight: 600 }}>Upload your resume first</span> to apply to jobs and see your match scores.{' '}
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => onNavigate('resume-upload')}>
            Upload now →
          </span>
        </div>
      )}

      {loading ? (
        <Card style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>Loading jobs...</p>
        </Card>
      ) : jobs.length === 0 ? (
        <Card style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>No open positions right now. Check back soon.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {jobs.map((job) => {
            const appResult = applied[job.job_id]
            return (
              <Card key={job.job_id} style={{ padding: isMobile ? '16px' : '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>
                      {job.title}
                    </div>
                    <div style={{ fontSize: 13, color: '#6B6B6B' }}>
                      {job.company} · {job.location}
                      {job.employment_type && ` · ${job.employment_type}`}
                    </div>
                    <div style={{ fontSize: 12, color: '#ABABAB', marginTop: 4 }}>
                      ${job.salary_min?.toLocaleString()} – ${job.salary_max?.toLocaleString()}
                    </div>
                    {job.posted_by && (
                      <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 4 }}>
                        Posted by{' '}
                        <span
                          onClick={(e) => { e.stopPropagation(); onSelectHiringManager && onSelectHiringManager(job.posted_by.user_id) }}
                          style={{ color: '#4A6FA5', fontWeight: 500, cursor: onSelectHiringManager ? 'pointer' : 'default', textDecoration: onSelectHiringManager ? 'underline' : 'none' }}
                        >
                          {job.posted_by.name}{job.posted_by.title ? `, ${job.posted_by.title}` : ''}
                        </span>
                      </div>
                    )}

                    {appResult && (
                      <div style={{ marginTop: 10, padding: '8px 12px', backgroundColor: '#EDF3EF', borderRadius: 8, display: 'inline-block' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#5C8B6E' }}>
                          ✓ Applied · Match score: {Math.round(appResult.overall_score)}/100
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedJob(job)}
                    style={{
                      backgroundColor: appResult ? '#F5F5F2' : '#F0F4FA',
                      color: appResult ? '#6B6B6B' : '#4A6FA5',
                      border: 'none', borderRadius: 8,
                      padding: '9px 18px', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    {appResult ? 'Applied ✓' : 'Details'}
                  </button>
                </div>

                {job.required_skills?.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0F0EC' }}>
                    <SkillPills skills={job.required_skills} />
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <div
          onClick={() => setSelectedJob(null)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF', borderRadius: 16,
              width: '100%', maxWidth: 620,
              maxHeight: '85vh', overflowY: 'auto',
              padding: isMobile ? '24px 20px' : '32px',
              position: 'relative',
            }}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedJob(null)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 20, color: '#6B6B6B', cursor: 'pointer', lineHeight: 1 }}
            >
              ×
            </button>

              <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: 6 }}>
                {selectedJob.title}
              </h2>
              <div style={{ fontSize: 14, color: '#6B6B6B' }}>
                {selectedJob.company} · {selectedJob.location}
                {selectedJob.employment_type && ` · ${selectedJob.employment_type}`}
              </div>
              <div style={{ fontSize: 13, color: '#ABABAB', marginTop: 4 }}>
                ${selectedJob.salary_min?.toLocaleString()} – ${selectedJob.salary_max?.toLocaleString()} · {selectedJob.industry}
              </div>
              {selectedJob.posted_by && (
                <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 6 }}>
                  Posted by{' '}
                  <span style={{ color: '#4A6FA5', fontWeight: 500 }}>
                    {selectedJob.posted_by.name}{selectedJob.posted_by.title ? `, ${selectedJob.posted_by.title}` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Job Summary */}
            {selectedJob.jd_summary && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Job Summary
                </div>
                <div style={{ padding: '14px 16px', backgroundColor: '#F5F5F2', borderRadius: 10, borderLeft: '3px solid #5C8B6E' }}>
                  <p style={{ fontSize: 14, color: '#2A2A2A', lineHeight: 1.7, margin: 0 }}>
                    {selectedJob.jd_summary}
                  </p>
                </div>
              </div>
            )}

            {/* Required Skills */}
            {selectedJob.required_skills?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Required Skills
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedJob.required_skills.map((s: string, i: number) => (
                    <span key={i} style={{ fontSize: 12, backgroundColor: '#EDF3EF', color: '#5C8B6E', fontWeight: 500, padding: '4px 10px', borderRadius: 20 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Preferred Skills */}
            {selectedJob.preferred_skills?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Preferred Skills
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedJob.preferred_skills.map((s: string, i: number) => (
                    <span key={i} style={{ fontSize: 12, backgroundColor: '#EBF0F8', color: '#4A6FA5', fontWeight: 500, padding: '4px 10px', borderRadius: 20 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24, padding: '16px', backgroundColor: '#FAFAF7', borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 3 }}>Min Experience</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{selectedJob.min_experience_years || 0}+ years</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 3 }}>Work Type</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', textTransform: 'capitalize' }}>{selectedJob.employment_type || 'Not specified'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 3 }}>Industry</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{selectedJob.industry}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 3 }}>Salary</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>${selectedJob.salary_min?.toLocaleString()} – ${selectedJob.salary_max?.toLocaleString()}</div>
              </div>
            </div>

            {/* Full Description */}
            {(selectedJob.jd_standardized || selectedJob.raw_jd_text) && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>
                  Full Description
                </div>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', maxHeight: 420, overflowY: 'auto' }}>
                  <JDBody text={selectedJob.jd_standardized || selectedJob.raw_jd_text} />
                </div>
              </div>
            )}

            {error && (
              <div style={{ backgroundColor: '#FBF0EE', color: '#C4704F', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* Apply button */}
            {applied[selectedJob.job_id] ? (
              <div style={{ backgroundColor: '#EDF3EF', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#5C8B6E', marginBottom: 4 }}>✓ Application submitted</div>
                <div style={{ fontSize: 13, color: '#6B6B6B' }}>
                  Your match score: <span style={{ fontWeight: 700, color: '#1A1A1A' }}>{Math.round(applied[selectedJob.job_id].overall_score)}/100</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleApply(selectedJob.job_id)}
                disabled={applying}
                style={{
                  width: '100%', backgroundColor: applying ? '#ABABAB' : accentColor,
                  color: 'white', border: 'none', borderRadius: 10,
                  padding: '13px', fontSize: 15, fontWeight: 600,
                  cursor: applying ? 'not-allowed' : 'pointer',
                }}
              >
                {applying ? 'Submitting application...' : candidateId ? 'Apply Now' : 'Upload Resume to Apply'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
