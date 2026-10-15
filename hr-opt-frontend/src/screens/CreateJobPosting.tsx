import { useState } from 'react'
import type { Screen } from '../App'
import { Card } from '../components/shared'
import { extractJD, createJob, guidedExtractJD } from '../api'
import FieldOfStudySelector from '../components/FieldOfStudySelector'

interface Props {
  onNavigate: (screen: Screen) => void
  isMobile?: boolean
  employerId: string
  userId?: string
}

const accentColor = '#5C8B6E'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid #E8E8E4',
  backgroundColor: '#FAFAF7',
  fontSize: 14,
  color: '#1A1A1A',
  outline: 'none',
  boxSizing: 'border-box',
}

type Step = 'input' | 'review' | 'saving' | 'done'
type InputMode = 'paste' | 'guided'

export default function CreateJobPosting({ onNavigate, isMobile, employerId, userId }: Props) {
  const [step, setStep] = useState<Step>('input')
  const [jdText, setJdText] = useState('')
  const [loading, setLoading] = useState(false)
  const [_extracted, setExtracted] = useState<any>(null) // eslint-disable-line
  const [error, setError] = useState('')

  // Extracted fields
  const [missingFields, setMissingFields] = useState<string[]>([])

  // Editable fields
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [location, setLocation] = useState('')
  const [industry, setIndustry] = useState('')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [minExp, setMinExp] = useState('')
  const [educationLevel, setEducationLevel] = useState('')
  const [educationFields, setEducationFields] = useState<string[]>([])
  const [educationNotes, setEducationNotes] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [requiredSkills, setRequiredSkills] = useState<string[]>([])
  const [preferredSkills, setPreferredSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [skillType, setSkillType] = useState<'required' | 'preferred'>('required')
  const [skillWeights, setSkillWeights] = useState<Record<string, number>>({})
  const [deadline, setDeadline] = useState('')

  // Guided mode state
  const [inputMode, setInputMode] = useState<InputMode>('paste')
  const [guidedDescription, setGuidedDescription] = useState('')
  const [guidedQA, setGuidedQA] = useState<{ q: string; a: string }[]>([])
  const [pendingQuestion, setPendingQuestion] = useState('')
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [guidedLoading, setGuidedLoading] = useState(false)
  const [guidedPhase, setGuidedPhase] = useState<'start' | 'qa'>('start')

  const pad = isMobile ? '20px 16px' : '32px 36px'

  const prefillFromExtracted = (e: any, missing: string[]) => {
    setMissingFields(missing || [])
    setTitle(e.title || '')
    setCompany(e.company || '')
    setLocation(e.location || '')
    setIndustry(e.industry || '')
    setSalaryMin(e.salary_min ? String(e.salary_min) : '')
    setSalaryMax(e.salary_max ? String(e.salary_max) : '')
    setMinExp(e.min_experience_years ? String(e.min_experience_years) : '')
    setEducationLevel(e.education_level || '')
    setEducationFields(e.education_fields || [])
    setEducationNotes(e.education_notes || '')
    setEmploymentType(e.employment_type || '')
    const reqSkills: string[] = e.required_skills || []
    setRequiredSkills(reqSkills)
    setSkillWeights(Object.fromEntries(reqSkills.map((s: string) => [s, 5])))
    setPreferredSkills(e.preferred_skills || [])
    setStep('review')
  }

  const handleExtract = async () => {
    if (!jdText.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await extractJD(jdText)
      setExtracted(result)
      prefillFromExtracted(result.extracted, result.missing_required)
    } catch (err: any) {
      setError(err.message || 'Failed to extract JD')
    } finally {
      setLoading(false)
    }
  }

  const handleGuidedStart = async () => {
    if (!guidedDescription.trim()) return
    setGuidedLoading(true)
    setError('')
    try {
      const result = await guidedExtractJD(guidedDescription, [])
      if (result.status === 'complete') {
        setJdText(result.raw_text || guidedDescription)
        prefillFromExtracted(result.extracted, result.missing_required || [])
      } else {
        setPendingQuestion(result.question || '')
        setGuidedPhase('qa')
      }
    } catch (err: any) {
      setError(err.message && err.message !== 'Unknown error' ? err.message : 'AI is unavailable right now — try again in a moment.')
    } finally {
      setGuidedLoading(false)
    }
  }

  const handleGuidedAnswer = async (skipCurrent = false) => {
    const answer = skipCurrent ? '(not specified)' : currentAnswer.trim()
    if (!skipCurrent && !answer) return
    const newQA = [...guidedQA, { q: pendingQuestion, a: answer }]
    setGuidedQA(newQA)
    setCurrentAnswer('')
    setGuidedLoading(true)
    setError('')
    try {
      const result = await guidedExtractJD(guidedDescription, newQA)
      if (result.status === 'complete') {
        setJdText(result.raw_text || [guidedDescription, ...newQA.map((p) => `Q: ${p.q}\nA: ${p.a}`)].join('\n\n'))
        prefillFromExtracted(result.extracted, result.missing_required || [])
      } else {
        setPendingQuestion(result.question || '')
      }
    } catch (err: any) {
      setError(err.message && err.message !== 'Unknown error' ? err.message : 'AI is unavailable right now — try again in a moment.')
    } finally {
      setGuidedLoading(false)
    }
  }

  const handleGuidedGenerateNow = async () => {
    // Force completion with whatever has been collected; include current answer if present
    const currentQA = currentAnswer.trim()
      ? [...guidedQA, { q: pendingQuestion, a: currentAnswer.trim() }]
      : guidedQA
    setGuidedLoading(true)
    setError('')
    try {
      // Signal the LLM to finalize now
      const forceQA = [...currentQA, { q: '(ready to generate)', a: 'Generate the job posting now with all information collected so far.' }]
      const result = await guidedExtractJD(guidedDescription, forceQA)
      const rawJD = result.raw_text || [guidedDescription, ...currentQA.map((p) => `Q: ${p.q}\nA: ${p.a}`)].join('\n\n')
      setJdText(rawJD)
      // Use extracted if complete, fall back to partial if LLM still returned needs_info
      const data = result.status === 'complete' ? result.extracted : (result.partial || {})
      prefillFromExtracted(data, result.missing_required || [])
    } catch (err: any) {
      setError(err.message && err.message !== 'Unknown error' ? err.message : 'AI is unavailable right now — try again in a moment.')
    } finally {
      setGuidedLoading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    setStep('saving')
    try {
      await createJob({
        employer_id: employerId,
        raw_text: jdText,
        title,
        company,
        location,
        industry,
        salary_min: parseInt(salaryMin),
        salary_max: parseInt(salaryMax),
        required_skills: requiredSkills,
        preferred_skills: preferredSkills,
        min_experience_years: parseInt(minExp) || 0,
        education_requirement: educationLevel,
        education_level: educationLevel,
        education_fields: educationFields,
        education_notes: educationNotes,
        employment_type: employmentType || undefined,
        skill_weights: skillWeights,
        posted_by_user_id: userId,
        application_deadline: deadline || undefined,
      })
      setStep('done')
    } catch (err: any) {
      setError(err.message || 'Failed to save job')
      setStep('review')
    } finally {
      setLoading(false)
    }
  }

  const addSkill = () => {
    if (!skillInput.trim()) return
    const skill = skillInput.trim()
    if (skillType === 'required') {
      setRequiredSkills([...requiredSkills, skill])
      setSkillWeights((prev) => ({ ...prev, [skill]: 5 }))  // default medium
    } else {
      setPreferredSkills([...preferredSkills, skill])
    }
    setSkillInput('')
  }

  if (step === 'done') {
    return (
      <div style={{ padding: pad, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
            Job Posted!
          </h1>
          <p style={{ color: '#6B6B6B', marginBottom: 24 }}>
            Your job posting is live and candidates are being matched.
          </p>
          <button
            onClick={() => onNavigate('dashboard')}
            style={{
              backgroundColor: accentColor,
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (step === 'saving') {
    return (
      <div style={{ padding: pad, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ color: '#6B6B6B' }}>Saving job posting...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: pad, width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <button
          onClick={() => step === 'review' ? setStep('input') : onNavigate('dashboard')}
          style={{
            background: 'none', border: 'none', color: '#6B6B6B',
            fontSize: 13, cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14,
          }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em' }}>
          {step === 'input' ? 'Create Job Posting' : 'Review & Confirm'}
        </h1>
        <p style={{ color: '#6B6B6B', marginTop: 4, fontSize: 13 }}>
          {step === 'input' && inputMode === 'paste'
            ? "Paste your job description and we'll extract the key details."
            : step === 'input' && inputMode === 'guided'
            ? "Describe the role and our AI will ask follow-up questions to build the posting."
            : 'Review what we extracted and fill in anything missing.'}
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FBF0EE', color: '#C4704F', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {step === 'input' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 0, borderRadius: 8, border: '1px solid #E8E8E4', overflow: 'hidden', width: 'fit-content', marginBottom: 4 }}>
            {(['paste', 'guided'] as InputMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => { setInputMode(mode); setError(''); setGuidedPhase('start') }}
                style={{
                  padding: '8px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  backgroundColor: inputMode === mode ? accentColor : '#FAFAF7',
                  color: inputMode === mode ? 'white' : '#6B6B6B',
                }}
              >
                {mode === 'paste' ? '📋 Paste JD' : '✦ Build with AI'}
              </button>
            ))}
          </div>

          {inputMode === 'paste' && (
            <>
              <Card style={{ padding: isMobile ? '18px 16px' : '24px' }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>
                  Job Description
                </h2>
                <p style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 14 }}>
                  Paste the full job description — our AI will extract all the key details.
                </p>
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  rows={isMobile ? 10 : 16}
                  placeholder="Paste job description here..."
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                />
              </Card>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleExtract}
                  disabled={loading || !jdText.trim()}
                  style={{
                    backgroundColor: loading ? '#ABABAB' : accentColor,
                    color: 'white', border: 'none', borderRadius: 8,
                    padding: '10px 28px', fontSize: 14, fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Extracting...' : 'Extract Details →'}
                </button>
              </div>
            </>
          )}

          {inputMode === 'guided' && guidedPhase === 'start' && (
            <>
              <Card style={{ padding: isMobile ? '18px 16px' : '24px' }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>
                  Describe the Role
                </h2>
                <p style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 14 }}>
                  Write a brief description — even a sentence works. The AI will ask follow-up questions to fill in the rest.
                </p>
                <textarea
                  value={guidedDescription}
                  onChange={(e) => setGuidedDescription(e.target.value)}
                  rows={isMobile ? 5 : 6}
                  placeholder='e.g. "Senior Data Scientist with 5+ years, Python and SQL required, remote, FanDuel"'
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                  onKeyDown={(e) => e.key === 'Enter' && e.metaKey && handleGuidedStart()}
                />
              </Card>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleGuidedStart}
                  disabled={guidedLoading || !guidedDescription.trim()}
                  style={{
                    backgroundColor: guidedLoading ? '#ABABAB' : accentColor,
                    color: 'white', border: 'none', borderRadius: 8,
                    padding: '10px 28px', fontSize: 14, fontWeight: 600,
                    cursor: guidedLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {guidedLoading ? 'Thinking...' : 'Start →'}
                </button>
              </div>
            </>
          )}

          {inputMode === 'guided' && guidedPhase === 'qa' && (
            <Card style={{ padding: isMobile ? '18px 16px' : '24px' }}>
              {/* Conversation so far */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div style={{ backgroundColor: '#F5F5F2', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1A1A1A' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6B6B6B', display: 'block', marginBottom: 4 }}>YOU</span>
                  {guidedDescription}
                </div>
                {guidedQA.map((pair, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ backgroundColor: '#EBF0F8', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#4A6FA5' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>✦ AI</span>
                      {pair.q}
                    </div>
                    <div style={{ backgroundColor: '#F5F5F2', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1A1A1A', marginLeft: 16 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#6B6B6B', display: 'block', marginBottom: 4 }}>YOU</span>
                      {pair.a}
                    </div>
                  </div>
                ))}
                <div style={{ backgroundColor: '#EBF0F8', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#4A6FA5' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>✦ AI</span>
                  {pendingQuestion}
                </div>
              </div>

              {/* Answer input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  rows={2}
                  placeholder="Your answer..."
                  disabled={guidedLoading}
                  style={{ ...inputStyle, resize: 'none' }}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleGuidedAnswer())}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={handleGuidedGenerateNow}
                    disabled={guidedLoading}
                    style={{ backgroundColor: 'transparent', border: `1px solid ${accentColor}`, borderRadius: 8, padding: '8px 14px', fontSize: 12, color: accentColor, cursor: guidedLoading ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                  >
                    Generate Now →
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleGuidedAnswer(true)}
                      disabled={guidedLoading}
                      style={{ backgroundColor: 'transparent', border: '1px solid #E8E8E4', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#6B6B6B', cursor: guidedLoading ? 'not-allowed' : 'pointer', fontWeight: 500 }}
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => handleGuidedAnswer()}
                      disabled={guidedLoading || !currentAnswer.trim()}
                      style={{ backgroundColor: guidedLoading ? '#ABABAB' : accentColor, color: 'white', border: 'none', borderRadius: 8, padding: '8px 24px', fontSize: 13, fontWeight: 600, cursor: guidedLoading ? 'not-allowed' : 'pointer' }}
                    >
                      {guidedLoading ? 'Thinking...' : 'Continue →'}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {step === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {missingFields.length > 0 && (
            <div style={{ backgroundColor: '#EBF0F8', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#4A6FA5' }}>
              ⚠️ Please fill in the missing required fields: {missingFields.join(', ')}
            </div>
          )}

          <Card style={{ padding: isMobile ? '18px 16px' : '24px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 18 }}>Role Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <Field label="Job Title *">
                <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Company *">
                <input value={company} onChange={(e) => setCompany(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Location *">
                <input value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Industry *">
                <input value={industry} onChange={(e) => setIndustry(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Salary Min *">
                <input value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="e.g. 90000" style={inputStyle} />
              </Field>
              <Field label="Salary Max *">
                <input value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="e.g. 130000" style={inputStyle} />
              </Field>
              <Field label="Min Experience (years) *">
                <input value={minExp} onChange={(e) => setMinExp(e.target.value)} placeholder="e.g. 2" style={inputStyle} />
              </Field>
              <Field label="Employment Type">
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  style={{ ...inputStyle, appearance: 'none' }}
                >
                  <option value="">Not specified</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">Onsite</option>
                </select>
              </Field>
              <Field label="Application Deadline">
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  style={inputStyle}
                />
              </Field>
              <Field label="Education Level *">
                <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                  <option value="">Select level...</option>
                  <option value="High School">High School</option>
                  <option value="Associate's">Associate's</option>
                  <option value="Bachelor's">Bachelor's</option>
                  <option value="Master's">Master's</option>
                  <option value="PhD">PhD</option>
                </select>
              </Field>
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                <FieldOfStudySelector
                  selected={educationFields}
                  onChange={setEducationFields}
                  hint="Select all fields that qualify for this role"
                />
              </div>
              <Field label="Education Notes" style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                <input value={educationNotes} onChange={(e) => setEducationNotes(e.target.value)} placeholder="e.g. Master's a plus, MBA preferred" style={inputStyle} />
              </Field>
            </div>
          </Card>

          <Card style={{ padding: isMobile ? '18px 16px' : '24px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 14 }}>Skills</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                placeholder="Add a skill..."
                style={{ ...inputStyle, flex: 1 }}
              />
              <select
                value={skillType}
                onChange={(e) => setSkillType(e.target.value as 'required' | 'preferred')}
                style={{ ...inputStyle, width: 'auto' }}
              >
                <option value="required">Required</option>
                <option value="preferred">Preferred</option>
              </select>
              <button
                onClick={addSkill}
                style={{
                  backgroundColor: accentColor, color: 'white', border: 'none',
                  borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Add
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6B6B6B', marginBottom: 8 }}>Required Skills — set importance</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {requiredSkills.map((s, i) => (
                  <div key={i} style={{ backgroundColor: '#F5F5F2', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{s}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#6B6B6B' }}>
                          {skillWeights[s] || 5}/10
                        </span>
                        <button
                          onClick={() => {
                            setRequiredSkills(requiredSkills.filter((_, j) => j !== i))
                            setSkillWeights((prev) => { const next = {...prev}; delete next[s]; return next })
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ABABAB', fontSize: 16, padding: 0 }}
                        >×</button>
                      </div>
                    </div>
                    <input
                      type="range" min={1} max={10}
                      value={skillWeights[s] || 3}
                      onChange={(e) => setSkillWeights((prev) => ({ ...prev, [s]: parseInt(e.target.value) }))}
                      style={{ width: '100%', accentColor: '#5C8B6E', cursor: 'pointer', height: 4 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#ABABAB', marginTop: 2 }}>
                      <span>Low</span><span>Critical</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6B6B6B', marginBottom: 8 }}>Preferred</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {preferredSkills.map((s, i) => (
                  <span key={i} style={{
                    backgroundColor: '#EBF0F8', color: '#4A6FA5', fontSize: 12,
                    fontWeight: 500, padding: '4px 10px', borderRadius: 20,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {s}
                    <button
                      onClick={() => setPreferredSkills(preferredSkills.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A6FA5', fontSize: 14, padding: 0 }}
                    >×</button>
                  </span>
                ))}
              </div>
            </div>
          </Card>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 40 }}>
            <button
              onClick={() => setStep('input')}
              style={{
                backgroundColor: 'transparent', border: '1px solid #E8E8E4',
                borderRadius: 8, padding: '10px 24px', fontSize: 14,
                fontWeight: 600, color: '#6B6B6B', cursor: 'pointer',
              }}
            >
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                backgroundColor: loading ? '#ABABAB' : accentColor,
                color: 'white', border: 'none', borderRadius: 8,
                padding: '10px 24px', fontSize: 14, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Saving...' : 'Publish Job Posting'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B6B6B', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}
