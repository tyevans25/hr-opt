import { useEffect, useState } from 'react'
import type { Screen } from '../App'
import { Card } from '../components/shared'
import { getUserProfile } from '../api'

interface Props {
  userId: string
  onNavigate: (screen: Screen) => void
  isMobile?: boolean
}

export default function HiringManagerProfile({ userId, onNavigate, isMobile }: Props) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const pad = isMobile ? '20px 16px' : '32px 36px'

  useEffect(() => {
    if (!userId) return
    getUserProfile(userId)
      .then(setProfile)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div style={{ padding: pad }}><p style={{ color: '#6B6B6B' }}>Loading...</p></div>
  if (error || !profile) return <div style={{ padding: pad }}><p style={{ color: '#C4704F' }}>{error || 'Profile not found'}</p></div>

  const initials = profile.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'

  return (
    <div style={{ padding: pad, maxWidth: 720 }}>
      <button
        onClick={() => onNavigate('job-browser')}
        style={{ background: 'none', border: 'none', color: '#6B6B6B', fontSize: 13, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}
      >
        ← Back
      </button>

      <Card style={{ padding: isMobile ? '20px 16px' : '28px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#4A6FA5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'white', flexShrink: 0 }}>
            {initials}
          </div>
          <div>
            <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.01em', marginBottom: 2 }}>
              {profile.name}
            </h1>
            {profile.title && (
              <div style={{ fontSize: 13, color: '#6B6B6B' }}>{profile.title}</div>
            )}
            {profile.company && (
              <div style={{ fontSize: 13, color: '#4A6FA5', fontWeight: 500 }}>{profile.company}</div>
            )}
          </div>
        </div>
      </Card>

      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#6B6B6B', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
        Open Positions — {profile.posted_jobs?.length ?? 0}
      </h2>

      {profile.posted_jobs?.length === 0 ? (
        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>No active postings.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(profile.posted_jobs || []).map((job: any) => (
            <Card key={job.job_id} style={{ padding: isMobile ? '14px 16px' : '16px 22px' }}>
              <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 3 }}>{job.title}</div>
              <div style={{ fontSize: 12, color: '#6B6B6B' }}>
                {job.location}{job.employment_type ? ` · ${job.employment_type}` : ''}
              </div>
              <div style={{ fontSize: 11, color: '#ABABAB', marginTop: 3 }}>
                Posted {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
