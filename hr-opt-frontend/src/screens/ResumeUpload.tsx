import { useState, useRef } from 'react'
import type { Screen } from '../App'
import { extractCandidate, createCandidate, getUser, setUser } from '../api'
import FieldOfStudySelector from '../components/FieldOfStudySelector'

interface Props {
  onNavigate: (screen: Screen) => void
  onCandidateCreated: (candidateId: string) => void
}

type Step = 'idle' | 'dragging' | 'uploading' | 'review' | 'saving' | 'done'
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

export default function ResumeUpload({ onNavigate, onCandidateCreated }: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [_file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Extracted fields
  const [extracted, setExtracted] = useState<any>(null)
  const [rawText, setRawText] = useState('')
  const [filename, setFilename] = useState('')

  // Editable profile fields
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [yearsExp, setYearsExp] = useState('')
  const [desiredRoles, setDesiredRoles] = useState<string[]>([])
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [workPref, setWorkPref] = useState('')
  const [educationFields, setEducationFields] = useState<string[]>([])
  const [relocation, setRelocation] = useState(false)
  const [roleInput, setRoleInput] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [stagedResumePath, setStagedResumePath] = useState('')

  const handleFile = async (f: File) => {
    setFile(f)
    setFilename(f.name)
    setStep('uploading')
    setError('')
    try {
      const result = await extractCandidate(f)
      setExtracted(result)
      setRawText(result.raw_text || '')
      setMissingFields(result.missing_required || [])
      setStagedResumePath(result.staged_resume_path || '')
      const e = result.extracted
      setName(e.name || '')
      setLocation(e.location || '')
      setSkills(e.skills || [])
      setYearsExp(e.years_of_experience ? String(e.years_of_experience) : '')
      setStep('review')
    } catch (err: any) {
      setError(err.message || 'Failed to parse resume')
      setStep('idle')
    }
  }

  const handleSave = async () => {
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    setStep('saving')
    setError('')
    try {
      const result = await createCandidate({
        email,
        raw_text: rawText,
        filename,
        name,
        location,
        skills,
        work_experience: extracted?.extracted?.work_experience || [],
        education: extracted?.extracted?.education || [],
        years_of_experience: parseInt(yearsExp) || 0,
        desired_roles: desiredRoles,
        salary_min: salaryMin ? parseInt(salaryMin) : undefined,
        salary_max: salaryMax ? parseInt(salaryMax) : undefined,
        work_preference: workPref || undefined,
        education_fields: educationFields,
        open_to_relocation: relocation,
        staged_resume_path: stagedResumePath || undefined,
      })
      // Update stored user with candidate profile ID
      const savedUser = getUser()
      if (savedUser) {
        setUser({ ...savedUser, candidate_id: result.candidate_id })
      }
      onCandidateCreated(result.candidate_id)
      setStep('done')
    } catch (err: any) {
      setError(err.message || 'Failed to save profile')
      setStep('review')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setStep('idle')
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  if (step === 'done') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#EDF3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M7 14l5 5 9-9" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Profile created!</h2>
          <p style={{ fontSize: 14, color: '#6B6B6B', marginBottom: 24 }}>
            Your resume has been analyzed and your profile is live.
          </p>
          <button
            onClick={() => onNavigate('interview-room')}
            style={{ backgroundColor: accentColor, color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginRight: 10 }}
          >
            Start Interview
          </button>
          <button
            onClick={() => onNavigate('job-browser')}
            style={{ backgroundColor: '#F5F5F2', color: '#1A1A1A', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Browse Jobs
          </button>
        </div>
      </div>
    )
  }

  if (step === 'saving') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6B6B6B' }}>Saving your profile...</p>
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FAFAF7', padding: '40px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <button
            onClick={() => setStep('idle')}
            style={{ background: 'none', border: 'none', color: '#6B6B6B', fontSize: 13, cursor: 'pointer', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>Review Your Profile</h1>
          <p style={{ color: '#6B6B6B', fontSize: 13, marginBottom: 24 }}>
            We extracted this from your resume. Fill in anything missing.
          </p>

          {missingFields.length > 0 && (
            <div style={{ backgroundColor: '#EBF0F8', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#4A6FA5', marginBottom: 16 }}>
              ⚠️ Please fill in: {missingFields.join(', ')}
            </div>
          )}

          {error && (
            <div style={{ backgroundColor: '#FBF0EE', color: '#C4704F', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Email *">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" style={inputStyle} />
            </Field>
            <Field label="Full Name *">
              <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Location">
              <input value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Years of Experience">
              <input value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} placeholder="e.g. 3" style={inputStyle} />
            </Field>

            <Field label="Desired Roles *">
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && roleInput.trim()) {
                      setDesiredRoles([...desiredRoles, roleInput.trim()])
                      setRoleInput('')
                    }
                  }}
                  placeholder="e.g. Data Scientist"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => {
                    if (roleInput.trim()) {
                      setDesiredRoles([...desiredRoles, roleInput.trim()])
                      setRoleInput('')
                    }
                  }}
                  style={{ backgroundColor: accentColor, color: 'white', border: 'none', borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Add
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {desiredRoles.map((r, i) => (
                  <span key={i} style={{ backgroundColor: '#EDF3EF', color: '#5C8B6E', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {r}
                    <button onClick={() => setDesiredRoles(desiredRoles.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5C8B6E', fontSize: 14, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
            </Field>

            <Field label="Skills">
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && skillInput.trim()) {
                      setSkills([...skills, skillInput.trim()])
                      setSkillInput('')
                    }
                  }}
                  placeholder="Add a skill..."
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => {
                    if (skillInput.trim()) {
                      setSkills([...skills, skillInput.trim()])
                      setSkillInput('')
                    }
                  }}
                  style={{ backgroundColor: accentColor, color: 'white', border: 'none', borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Add
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {skills.map((s, i) => (
                  <span key={i} style={{ backgroundColor: '#F5F5F2', color: '#6B6B6B', fontSize: 12, padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {s}
                    <button onClick={() => setSkills(skills.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ABABAB', fontSize: 14, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Salary Min">
                <input value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="e.g. 90000" style={inputStyle} />
              </Field>
              <Field label="Salary Max">
                <input value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="e.g. 130000" style={inputStyle} />
              </Field>
            </div>

            <Field label="Work Preference">
              <select value={workPref} onChange={(e) => setWorkPref(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                <option value="">Not specified</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
            </Field>

            <FieldOfStudySelector
              selected={educationFields}
              onChange={setEducationFields}
              label="Field of Study"
              hint="Select the field(s) that best match your educational background"
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#1A1A1A' }}>
              <input type="checkbox" checked={relocation} onChange={(e) => setRelocation(e.target.checked)} />
              Open to relocation
            </label>

            <button
              onClick={handleSave}
              style={{ backgroundColor: accentColor, color: 'white', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}
            >
              Create Profile
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAF7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative' }}>
      <button
        onClick={() => onNavigate('dashboard')}
        style={{ position: 'absolute', top: 20, left: 20, background: 'none', border: 'none', color: '#6B6B6B', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        ← Dashboard
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 12c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="5" r="2.5" stroke="white" strokeWidth="1.5" />
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#1A1A1A', letterSpacing: '-0.02em' }}>HR-Opt</span>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FBF0EE', color: '#C4704F', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, maxWidth: 540, width: '100%' }}>
          {error}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 540 }}>
        {step === 'uploading' ? (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: '40px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Analyzing resume...</h2>
            <p style={{ fontSize: 13, color: '#6B6B6B' }}>Extracting your skills, experience, and education.</p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.025em', marginBottom: 8 }}>
                Upload your resume
              </h1>
              <p style={{ fontSize: 15, color: '#6B6B6B', lineHeight: 1.5 }}>
                Our AI will analyze your resume and build your candidate profile.
              </p>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setStep('dragging') }}
              onDragLeave={() => setStep('idle')}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${step === 'dragging' ? accentColor : '#D4D4CE'}`,
                borderRadius: 12,
                backgroundColor: step === 'dragging' ? '#EDF3EF' : '#FFFFFF',
                padding: '56px 40px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: step === 'dragging' ? accentColor : '#F0F0EC', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M14 20V8M7 13l7-7 7 7" stroke={step === 'dragging' ? 'white' : '#6B6B6B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 22h20" stroke={step === 'dragging' ? 'white' : '#6B6B6B'} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}>
                {step === 'dragging' ? 'Drop it here' : 'Drag and drop your resume'}
              </p>
              <p style={{ fontSize: 13, color: '#6B6B6B' }}>
                or <span style={{ color: accentColor, fontWeight: 600 }}>browse files</span>
              </p>
              <p style={{ fontSize: 11, color: '#ABABAB', marginTop: 16 }}>PDF or DOCX — max 10 MB</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B6B6B', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}
