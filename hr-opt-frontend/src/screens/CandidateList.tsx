import { useEffect, useState } from 'react'
import type { Screen } from '../App'
import { Card, CircularScore } from '../components/shared'
import { getAllEmployerApplications, searchCandidatesAI, updateApplicationStatus } from '../api'
import { useBreakpoint } from '../hooks/useBreakpoint'

interface Props {
  onNavigate: (screen: Screen) => void
  onSelectCandidate: (id: string, jobId: string) => void
  isMobile?: boolean
  employerId: string
  initialJobFilter?: string | null
}

const accentColor = '#4A6FA5'
const avatarColors = ['#4A6FA5', '#5C8B6E', '#C4704F', '#7B6FA5', '#5C7A8B', '#8B6E5C']

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

type SortField = 'overall_score' | 'skill_match_score' | 'experience_score' | 'relevant_experience_years' | 'first_name' | 'last_name' | 'custom_skill'

export default function CandidateList({ onNavigate, onSelectCandidate, isMobile, employerId, initialJobFilter }: Props) {
  // Use a wider breakpoint for this data-dense table — card layout below 1024px
  const useCardLayout = useBreakpoint(1024) || !!isMobile
  const [allApplications, setAllApplications] = useState<any[]>([])
  const [displayApplications, setDisplayApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [search, setSearch] = useState('')
  const [jobFilter, setJobFilter] = useState(initialJobFilter || 'all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [recFilter, setRecFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('overall_score')
  const [sortAsc, setSortAsc] = useState(false)

  // AI search
  const [aiQuery, setAiQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiFilterSummary, setAiFilterSummary] = useState<string | null>(null)
  const [isAiMode, setIsAiMode] = useState(false)

  // Skill sort
  const [skillSortMode, setSkillSortMode] = useState(false)
  const [skillSortWeights, setSkillSortWeights] = useState<Record<string, number>>({})

  const pad = useCardLayout ? '20px 16px' : '28px 32px'

  useEffect(() => {
    if (!employerId) {
      setLoading(false)
      setError('No employer account linked. Please log out and back in.')
      return
    }
    setLoading(true)
    getAllEmployerApplications(employerId)
      .then((data) => {
        const apps = data.applications || []
        setAllApplications(apps)
        setDisplayApplications(apps)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [employerId])

  const handleStatusChange = async (applicationId: string, status: string) => {
    try {
      await updateApplicationStatus(applicationId, status)
      const update = (list: any[]) => list.map((a) => a.application_id === applicationId ? { ...a, status } : a)
      setAllApplications(update)
      setDisplayApplications(update)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return
    setAiLoading(true)
    setError('')
    try {
      const result = await searchCandidatesAI(employerId, aiQuery)
      setDisplayApplications(result.applications || [])
      setAiFilterSummary(result.filter_summary || aiQuery)
      setIsAiMode(true)
      setSearch('')
      setJobFilter('all')
      setStatusFilter('all')
      setRecFilter('all')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const clearAiSearch = () => {
    setIsAiMode(false)
    setAiFilterSummary(null)
    setAiQuery('')
    setDisplayApplications(allApplications)
  }

  const toggleSort = (field: SortField) => {
    if (field !== 'custom_skill') { setSkillSortMode(false) }
    if (sortField === field) setSortAsc((v) => !v)
    else { setSortField(field); setSortAsc(false) }
  }

  const activateSkillSort = () => {
    if (jobFilter === 'all') return
    const sample = allApplications.find((a) => a.job_id === jobFilter)
    if (!sample) return
    const weights: Record<string, number> = {}
    const jobWeights = sample.job_skill_weights || {}
    const skills: string[] = sample.job_required_skills || []
    skills.forEach((s) => { weights[s] = typeof jobWeights[s] === 'number' ? jobWeights[s] : 5 })
    setSkillSortWeights(weights)
    setSkillSortMode(true)
    setSortField('custom_skill')
    setSortAsc(false)
  }

  const computeSkillScore = (a: any) => {
    const matched = new Set((a.matched_skills || []).map((s: string) => s.toLowerCase()))
    const entries = Object.entries(skillSortWeights)
    const totalWeight = entries.reduce((s, [, v]) => s + v, 0)
    if (totalWeight === 0) return 0
    const score = entries.reduce((s, [skill, weight]) => s + (matched.has(skill.toLowerCase()) ? weight : 0), 0)
    return (score / totalWeight) * 100
  }

  const firstName = (a: any) => a.first_name || a.name?.split(' ')[0] || ''
  const lastName = (a: any) => a.last_name || (a.name?.split(' ').slice(1).join(' ') || '')

  // Distinct jobs for filter dropdown
  const jobOptions = Array.from(
    new Map(allApplications.map((a) => [a.job_id, a.job_title])).entries()
  ).sort((a, b) => a[1]?.localeCompare(b[1] || '') || 0)

  const baseList = isAiMode ? displayApplications : allApplications

  const filtered = baseList
    .filter((a) => jobFilter === 'all' || a.job_id === jobFilter)
    .filter((a) => statusFilter === 'all' || a.status === statusFilter)
    .filter((a) => recFilter === 'all' || a.recommendation === recFilter)
    .filter((a) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        firstName(a).toLowerCase().includes(q) ||
        lastName(a).toLowerCase().includes(q) ||
        a.name?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q) ||
        a.job_title?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      let av: any, bv: any
      if (sortField === 'custom_skill') { av = computeSkillScore(a); bv = computeSkillScore(b) }
      else if (sortField === 'first_name') { av = firstName(a).toLowerCase(); bv = firstName(b).toLowerCase() }
      else if (sortField === 'last_name') { av = lastName(a).toLowerCase(); bv = lastName(b).toLowerCase() }
      else { av = a[sortField] ?? 0; bv = b[sortField] ?? 0 }
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        fontSize: 11, fontWeight: 700, color: sortField === field ? accentColor : '#6B6B6B',
        letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 3,
      }}
    >
      {label}{sortField === field ? (sortAsc ? ' ▲' : ' ▼') : ''}
    </button>
  )

  const ColHeader = ({ children }: { children: string }) => (
    <span style={{ fontSize: 11, fontWeight: 700, color: '#6B6B6B', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{children}</span>
  )

  if (loading) {
    return (
      <div style={{ padding: pad, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: useCardLayout ? 20 : 26, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em' }}>Candidates</h1>
        </div>
        <Card style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>Loading candidates...</p>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: pad, width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: useCardLayout ? 16 : 24 }}>
        <h1 style={{ fontSize: useCardLayout ? 20 : 26, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em' }}>
          Candidates
        </h1>
        <p style={{ color: '#6B6B6B', marginTop: 4, fontSize: 13 }}>
          {allApplications.length} total across {jobOptions.length} role{jobOptions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FBF0EE', color: '#C4704F', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* AI Search Bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#ABABAB', pointerEvents: 'none' }}>✦</span>
            <input
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
              placeholder="AI search — e.g. 'candidates based in Austin with Snowflake experience'"
              style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 8, border: `1.5px solid ${isAiMode ? '#4A6FA5' : '#E8E8E4'}`, backgroundColor: isAiMode ? '#EBF0F8' : '#FAFAF7', fontSize: 13, color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={handleAiSearch}
            disabled={aiLoading || !aiQuery.trim()}
            style={{ padding: '10px 18px', borderRadius: 8, border: 'none', backgroundColor: aiLoading ? '#ABABAB' : accentColor, color: 'white', fontSize: 13, fontWeight: 600, cursor: aiLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {aiLoading ? 'Searching...' : 'Search'}
          </button>
          {isAiMode && (
            <button
              onClick={clearAiSearch}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E8E8E4', backgroundColor: 'white', color: '#6B6B6B', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
            >
              Clear
            </button>
          )}
        </div>
        {isAiMode && aiFilterSummary && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#4A6FA5', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700 }}>✦ AI filter:</span>
            <span>{aiFilterSummary}</span>
            <span style={{ color: '#ABABAB' }}>· {filtered.length} match{filtered.length !== 1 ? 'es' : ''}</span>
          </div>
        )}
      </div>

      {/* Standard filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name, location, role..."
          style={{ flex: '1 1 200px', padding: '8px 12px', borderRadius: 8, border: '1px solid #E8E8E4', backgroundColor: '#FFFFFF', fontSize: 13, color: '#1A1A1A', outline: 'none', minWidth: 0 }}
        />
        <select
          value={jobFilter}
          onChange={(e) => { setJobFilter(e.target.value); setSkillSortMode(false); if (sortField === 'custom_skill') setSortField('overall_score') }}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #E8E8E4', fontSize: 13, color: '#1A1A1A', backgroundColor: '#FFFFFF', cursor: 'pointer', flexShrink: 0 }}
        >
          <option value="all">All roles</option>
          {jobOptions.map(([id, title]) => (
            <option key={id} value={id}>{title}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #E8E8E4', fontSize: 13, color: '#1A1A1A', backgroundColor: '#FFFFFF', cursor: 'pointer', flexShrink: 0 }}
        >
          <option value="all">All statuses</option>
          <option value="new">Application Received</option>
          <option value="reviewed">Under Review</option>
          <option value="interview">Interview Stage</option>
          <option value="rejected">Not Moving Forward</option>
        </select>
        <select
          value={recFilter}
          onChange={(e) => setRecFilter(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #E8E8E4', fontSize: 13, color: '#1A1A1A', backgroundColor: '#FFFFFF', cursor: 'pointer', flexShrink: 0 }}
        >
          <option value="all">All recommendations</option>
          <option value="Strong Yes">Strong Yes</option>
          <option value="Yes">Yes</option>
          <option value="Maybe">Maybe</option>
          <option value="No">No</option>
        </select>
        {jobFilter !== 'all' && (
          <button
            onClick={() => skillSortMode ? (setSkillSortMode(false), setSortField('overall_score')) : activateSkillSort()}
            style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${skillSortMode ? accentColor : '#E8E8E4'}`, backgroundColor: skillSortMode ? '#EBF0F8' : '#FFFFFF', color: skillSortMode ? accentColor : '#6B6B6B', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            ⚖ Skill Sort{skillSortMode ? ' ✓' : ''}
          </button>
        )}
      </div>

      {/* Skill sort weight panel */}
      {skillSortMode && jobFilter !== 'all' && Object.keys(skillSortWeights).length > 0 && (
        <div style={{ backgroundColor: '#EBF0F8', borderRadius: 10, padding: '14px 18px', marginBottom: 12, border: '1px solid #C8D8EE' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4A6FA5', marginBottom: 10 }}>
            ⚖ Sort by Skill Weight — adjust importance, candidates ranked by weighted skill match
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: useCardLayout ? '1fr' : '1fr 1fr', gap: '10px 24px' }}>
            {Object.entries(skillSortWeights).map(([skill, weight]) => (
              <div key={skill}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>{skill}</span>
                  <span style={{ fontSize: 11, color: '#4A6FA5', fontWeight: 700 }}>{weight}/10</span>
                </div>
                <input
                  type="range" min={0} max={10} value={weight}
                  onChange={(e) => setSkillSortWeights((prev) => ({ ...prev, [skill]: parseInt(e.target.value) }))}
                  style={{ width: '100%', accentColor: '#4A6FA5', cursor: 'pointer', height: 4 }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 14 }}>
        {filtered.length} of {allApplications.length} candidates shown
      </div>

      {filtered.length === 0 ? (
        <Card style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>
            {allApplications.length === 0 ? 'No candidates yet. Post a job to start receiving applications.' : 'No candidates match the current filters.'}
          </p>
          {allApplications.length === 0 && (
            <button
              onClick={() => onNavigate('create-job')}
              style={{ marginTop: 12, backgroundColor: accentColor, color: 'white', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Post a Job
            </button>
          )}
        </Card>
      ) : useCardLayout ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((a, i) => (
            <Card key={a.application_id} style={{ padding: '14px', cursor: 'pointer' }} onClick={() => onSelectCandidate(a.candidate_id, a.job_id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: avatarColors[i % avatarColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {a.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: '#6B6B6B', marginTop: 1 }}>{a.location}</div>
                  <div style={{ fontSize: 11, color: '#4A6FA5', marginTop: 2, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.job_title}</div>
                </div>
                <CircularScore score={Math.round(a.overall_score)} size={40} accent={accentColor} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid #F5F5F2', alignItems: 'center', flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: 10, color: '#ABABAB' }}>Skills</div><div style={{ fontSize: 13, fontWeight: 700, color: '#5C8B6E' }}>{Math.round(a.skill_match_score)}</div></div>
                <div>
                  <div style={{ fontSize: 10, color: '#ABABAB' }}>Rel Exp</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#7B6FA5' }}>
                    {a.relevant_experience_years != null ? `${a.relevant_experience_years}y` : `${Math.round(a.experience_score)}`}
                  </div>
                  {a.relevant_experience_years != null && (
                    <div style={{ fontSize: 10, color: '#ABABAB' }}>{Math.round(a.experience_score)} score</div>
                  )}
                </div>
                {a.recommendation && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, backgroundColor: recColors[a.recommendation]?.bg || '#F5F5F2', color: recColors[a.recommendation]?.color || '#6B6B6B' }}>
                    {a.recommendation}
                  </span>
                )}
                <select
                  value={a.status}
                  onChange={(e) => { e.stopPropagation(); handleStatusChange(a.application_id, e.target.value) }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ marginLeft: 'auto', fontSize: 11, padding: '4px 8px', borderRadius: 8, border: '1px solid #E8E8E4', backgroundColor: statusColors[a.status]?.bg, color: statusColors[a.status]?.color, fontWeight: 600, cursor: 'pointer' }}
                >
                  <option value="new">Application Received</option>
                  <option value="reviewed">Under Review</option>
                  <option value="interview">Interview Stage</option>
                  <option value="rejected">Not Moving Forward</option>
                </select>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 80px 80px 80px 130px 130px', padding: '11px 20px', borderBottom: '1px solid #F0F0EC', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <SortBtn field="first_name" label="First" />
              <SortBtn field="last_name" label="Last" />
            </div>
            <ColHeader>Role</ColHeader>
            <SortBtn field="overall_score" label="Score" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <SortBtn field="skill_match_score" label="Skills" />
              {skillSortMode && <span style={{ fontSize: 9, color: '#4A6FA5', letterSpacing: '0.03em' }}>⚖ weighted</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <SortBtn field="relevant_experience_years" label="Rel Yrs" />
              <span style={{ fontSize: 9, color: '#ABABAB', letterSpacing: '0.03em' }}>exp score</span>
            </div>
            <ColHeader>Recommendation</ColHeader>
            <ColHeader>Status</ColHeader>
          </div>
          {/* Table rows */}
          {filtered.map((a, i) => (
            <div
              key={a.application_id}
              onClick={() => onSelectCandidate(a.candidate_id, a.job_id)}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 80px 80px 80px 130px 130px', padding: '13px 20px', borderBottom: i < filtered.length - 1 ? '1px solid #F5F5F2' : 'none', gap: 12, alignItems: 'center', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAFAF7')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: avatarColors[i % avatarColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {a.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: '#ABABAB', marginTop: 1 }}>{a.location}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#4A6FA5', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.job_title}>
                {a.job_title || '—'}
              </div>
              <CircularScore score={Math.round(a.overall_score)} size={44} accent={accentColor} />
              <div style={{ fontSize: 14, fontWeight: 700, color: '#5C8B6E' }}>
                {skillSortMode ? Math.round(computeSkillScore(a)) : Math.round(a.skill_match_score)}
                {skillSortMode && <div style={{ fontSize: 9, color: '#ABABAB', fontWeight: 400, marginTop: 1 }}>{Math.round(a.skill_match_score)} raw</div>}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#7B6FA5' }}>
                  {a.relevant_experience_years != null ? `${a.relevant_experience_years}y` : `${Math.round(a.experience_score)}`}
                </div>
                {a.relevant_experience_years != null && (
                  <div style={{ fontSize: 10, color: '#ABABAB', marginTop: 1 }}>{Math.round(a.experience_score)} score</div>
                )}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, backgroundColor: recColors[a.recommendation]?.bg || '#F5F5F2', color: recColors[a.recommendation]?.color || '#6B6B6B' }}>
                {a.recommendation || '—'}
              </span>
              <select
                value={a.status}
                onChange={(e) => { e.stopPropagation(); handleStatusChange(a.application_id, e.target.value) }}
                onClick={(e) => e.stopPropagation()}
                style={{ fontSize: 12, padding: '5px 8px', borderRadius: 8, border: '1px solid #E8E8E4', backgroundColor: statusColors[a.status]?.bg, color: statusColors[a.status]?.color, fontWeight: 600, cursor: 'pointer' }}
              >
                <option value="new">Application Received</option>
                <option value="reviewed">Under Review</option>
                <option value="interview">Interview Stage</option>
                <option value="rejected">Not Moving Forward</option>
              </select>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

