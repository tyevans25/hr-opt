import { useEffect, useState } from 'react'
import type { Screen } from '../App'
import { Card, JDBody } from '../components/shared'
import { listJobs, deleteJob } from '../api'

interface Props {
  onNavigate: (screen: Screen) => void
  isMobile?: boolean
  employerId: string
  onSelectJob: (jobId: string) => void
}

const accentColor = '#4A6FA5'

function formatDeadline(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isDeadlineSoon(dateStr: string): boolean {
  const deadline = new Date(dateStr + 'T00:00:00')
  const diff = (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= 7
}

export default function EmployerDashboard({ onNavigate, isMobile, employerId, onSelectJob }: Props) {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [_deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<any | null>(null)
  const pad = isMobile ? '20px 16px' : '32px 36px'

  // TODO: wire to delete button in job card
  // @ts-expect-error — kept for future use
  const _handleDelete = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this job posting? This will also remove all applications.')) return
    setDeletingId(jobId)
    try {
      await deleteJob(jobId)
      setJobs((prev) => prev.filter((j) => j.job_id !== jobId))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    listJobs(employerId)
      .then((data) => setJobs(data.jobs || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [employerId])

  return (
    <div style={{ padding: pad, width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 20 : 32, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em' }}>
            Dashboard
          </h1>
          <p style={{ color: '#6B6B6B', marginTop: 4, fontSize: 13 }}>
            {jobs.length} active job {jobs.length === 1 ? 'posting' : 'postings'}
          </p>
        </div>
        <button
          onClick={() => onNavigate('create-job')}
          style={{ backgroundColor: accentColor, color: 'white', border: 'none', borderRadius: 8, padding: isMobile ? '8px 14px' : '10px 20px', fontSize: isMobile ? 13 : 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M7 1.5v11M1.5 7h11" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {isMobile ? 'Post' : 'Post a Job'}
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#6B6B6B', fontSize: 14 }}>Loading...</p>
      ) : jobs.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ padding: isMobile ? '32px 20px' : '48px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>No job postings yet</h2>
            <p style={{ color: '#6B6B6B', fontSize: 14, marginBottom: 24 }}>
              Create your first job posting to start receiving and scoring candidates.
            </p>
            <button
              onClick={() => onNavigate('create-job')}
              style={{ backgroundColor: accentColor, color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Create Job Posting
            </button>
          </Card>

        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {jobs.map((job) => (
            <Card
              key={job.job_id}
              style={{ padding: isMobile ? '16px' : '20px 24px', cursor: 'pointer' }}
              onClick={() => onSelectJob(job.job_id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: '#1A1A1A' }}>{job.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, backgroundColor: '#EBF0F8', color: accentColor, padding: '2px 8px', borderRadius: 20 }}>
                      Active
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B6B6B' }}>
                    {job.company} · {job.location}
                    {job.employment_type && ` · ${job.employment_type}`}
                  </div>
                  <div style={{ fontSize: 12, color: '#ABABAB', marginTop: 4 }}>
                    ${job.salary_min?.toLocaleString()} – ${job.salary_max?.toLocaleString()}
                  </div>
                  {job.application_deadline && (
                    <div style={{ fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ color: isDeadlineSoon(job.application_deadline) ? '#C4704F' : '#6B6B6B' }}>
                        Applications close {formatDeadline(job.application_deadline)}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedJob(job) }}
                    style={{ backgroundColor: '#F0F4FA', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: accentColor, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    View JD
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectJob(job.job_id) }}
                    style={{ backgroundColor: '#F5F5F2', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#1A1A1A', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    View Candidates
                  </button>
                </div>
              </div>
              {job.required_skills?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0F0EC' }}>
                  {job.required_skills.slice(0, 5).map((s: string, i: number) => (
                    <span key={i} style={{ fontSize: 11, backgroundColor: '#F5F5F2', color: '#6B6B6B', padding: '3px 8px', borderRadius: 20 }}>{s}</span>
                  ))}
                  {job.required_skills.length > 5 && (
                    <span style={{ fontSize: 11, color: '#ABABAB' }}>+{job.required_skills.length - 5} more</span>
                  )}
                </div>
              )}
            </Card>
          ))}


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
                ${selectedJob.salary_min?.toLocaleString()} – ${selectedJob.salary_max?.toLocaleString()}{selectedJob.industry ? ` · ${selectedJob.industry}` : ''}
              </div>
            </div>

            {selectedJob.required_skills?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Required Skills
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedJob.required_skills.map((s: string, i: number) => (
                    <span key={i} style={{ fontSize: 12, backgroundColor: '#EBF0F8', color: accentColor, fontWeight: 500, padding: '4px 10px', borderRadius: 20 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedJob.preferred_skills?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Preferred Skills
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedJob.preferred_skills.map((s: string, i: number) => (
                    <span key={i} style={{ fontSize: 12, backgroundColor: '#F0F4FA', color: '#6B7A99', fontWeight: 500, padding: '4px 10px', borderRadius: 20 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

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
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{selectedJob.industry || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 3 }}>Salary</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>${selectedJob.salary_min?.toLocaleString()} – ${selectedJob.salary_max?.toLocaleString()}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 3 }}>Application Deadline</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: selectedJob.application_deadline && isDeadlineSoon(selectedJob.application_deadline) ? '#C4704F' : '#1A1A1A' }}>
                  {selectedJob.application_deadline ? formatDeadline(selectedJob.application_deadline) : 'No deadline set'}
                </div>
              </div>
            </div>

            {selectedJob.raw_jd_text && (
              <div style={{ marginBottom: 24 }}>
                {selectedJob.jd_summary && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                      Job Summary
                    </div>
                    <div style={{ fontSize: 13, color: '#2A2A2A', lineHeight: 1.7, marginBottom: 16, padding: '12px 14px', backgroundColor: '#F5F5F2', borderRadius: 8, borderLeft: '3px solid #5C8B6E' }}>
                      {selectedJob.jd_summary}
                    </div>
                  </>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Full Description
                </div>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', maxHeight: 340, overflowY: 'auto' }}>
                  <JDBody text={selectedJob.jd_standardized || selectedJob.raw_jd_text} />
                </div>
              </div>
            )}

            <button
              onClick={() => { setSelectedJob(null); onSelectJob(selectedJob.job_id) }}
              style={{
                width: '100%', backgroundColor: accentColor,
                color: 'white', border: 'none', borderRadius: 10,
                padding: '13px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}
            >
              View Candidates
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
