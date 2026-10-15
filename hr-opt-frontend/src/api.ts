const BASE = '/api'

// --- Auth helpers ---
export function getToken(): string | null {
  return localStorage.getItem('hr_opt_token')
}

export function setToken(token: string) {
  localStorage.setItem('hr_opt_token', token)
}

export function clearToken() {
  localStorage.removeItem('hr_opt_token')
  localStorage.removeItem('hr_opt_user')
}

export function getUser(): any | null {
  const u = localStorage.getItem('hr_opt_user')
  return u ? JSON.parse(u) : null
}

export function setUser(user: any) {
  localStorage.setItem('hr_opt_user', JSON.stringify(user))
}

async function request(path: string, options?: RequestInit) {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers || {}) }
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

// --- Auth ---
export async function signup(data: {
  email: string
  password: string
  role: string
  first_name: string
  last_name: string
  company_name?: string
  industry?: string
}) {
  const form = new FormData()
  form.append('email', data.email)
  form.append('password', data.password)
  form.append('role', data.role)
  form.append('first_name', data.first_name)
  form.append('last_name', data.last_name)
  if (data.company_name) form.append('company_name', data.company_name)
  if (data.industry) form.append('industry', data.industry)
  return request('/auth/signup', { method: 'POST', body: form })
}

export async function login(email: string, password: string) {
  const form = new FormData()
  form.append('email', email)
  form.append('password', password)
  return request('/auth/login', { method: 'POST', body: form })
}

export async function getMe() {
  return request('/auth/me')
}

// --- Employers ---
export async function createEmployer(data: {
  company_name: string
  email: string
  industry: string
}) {
  const form = new FormData()
  form.append('company_name', data.company_name)
  form.append('email', data.email)
  form.append('industry', data.industry)
  return request('/employers', { method: 'POST', body: form })
}

// --- Jobs ---
export async function extractJD(jdText: string) {
  const form = new FormData()
  form.append('jd_text', jdText)
  return request('/jobs/extract', { method: 'POST', body: form })
}

export async function createJob(data: {
  employer_id: string
  raw_text: string
  title: string
  company: string
  location: string
  industry: string
  salary_min: number
  salary_max: number
  required_skills: string[]
  preferred_skills: string[]
  min_experience_years: number
  education_requirement: string
  education_level?: string
  education_field?: string
  education_fields?: string[]
  education_notes?: string
  employment_type?: string
  skill_weights?: Record<string, number>
  posted_by_user_id?: string
  application_deadline?: string
}) {
  const form = new FormData()
  form.append('employer_id', data.employer_id)
  form.append('raw_text', data.raw_text)
  form.append('title', data.title)
  form.append('company', data.company)
  form.append('location', data.location)
  form.append('industry', data.industry)
  form.append('salary_min', String(data.salary_min))
  form.append('salary_max', String(data.salary_max))
  form.append('required_skills', JSON.stringify(data.required_skills))
  form.append('preferred_skills', JSON.stringify(data.preferred_skills || []))
  form.append('min_experience_years', String(data.min_experience_years))
  form.append('education_requirement', data.education_requirement)
  if (data.education_level) form.append('education_level', data.education_level)
  if (data.education_field) form.append('education_field', data.education_field)
  if (data.education_fields?.length) form.append('education_fields', JSON.stringify(data.education_fields))
  if (data.education_notes) form.append('education_notes', data.education_notes)
  if (data.employment_type) form.append('employment_type', data.employment_type)
  if (data.skill_weights) form.append('skill_weights', JSON.stringify(data.skill_weights))
  if (data.posted_by_user_id) form.append('posted_by_user_id', data.posted_by_user_id)
  if (data.application_deadline) form.append('application_deadline', data.application_deadline)
  return request('/jobs', { method: 'POST', body: form })
}

export async function listJobs(employerId: string) {
  return request(`/jobs?employer_id=${employerId}`)
}

export async function deleteJob(jobId: string) {
  return request(`/jobs/${jobId}`, { method: 'DELETE' })
}


export async function getJob(jobId: string) {
  return request(`/jobs/${jobId}`)
}

export async function getCandidatesForJob(jobId: string, topK = 10) {
  return request(`/jobs/${jobId}/candidates?top_k=${topK}`)
}

// --- Candidates ---
export async function extractCandidate(file: File) {
  const form = new FormData()
  form.append('resume', file)
  return request('/candidates/extract', { method: 'POST', body: form })
}

export async function createCandidate(data: {
  email: string
  raw_text: string
  filename: string
  name: string
  location: string
  skills: string[]
  work_experience: object[]
  education: object[]
  years_of_experience: number
  desired_roles: string[]
  salary_min?: number
  salary_max?: number
  work_preference?: string
  education_fields?: string[]
  open_to_relocation?: boolean
  staged_resume_path?: string
}) {
  const form = new FormData()
  form.append('email', data.email)
  form.append('raw_text', data.raw_text)
  form.append('filename', data.filename)
  form.append('name', data.name)
  form.append('location', data.location || '')
  form.append('skills', JSON.stringify(data.skills || []))
  form.append('work_experience', JSON.stringify(data.work_experience || []))
  form.append('education', JSON.stringify(data.education || []))
  form.append('years_of_experience', String(data.years_of_experience || 0))
  form.append('desired_roles', JSON.stringify(data.desired_roles || []))
  if (data.salary_min) form.append('salary_min', String(data.salary_min))
  if (data.salary_max) form.append('salary_max', String(data.salary_max))
  if (data.work_preference) form.append('work_preference', data.work_preference)
  if (data.education_fields?.length) form.append('education_fields', JSON.stringify(data.education_fields))
  form.append('open_to_relocation', String(data.open_to_relocation || false))
  if (data.staged_resume_path) form.append('staged_resume_path', data.staged_resume_path)
  return request('/candidates', { method: 'POST', body: form })
}

export function getResumeDownloadUrl(candidateId: string) {
  const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api'
  return `${base}/candidates/${candidateId}/resume`
}

export async function getCandidate(candidateId: string, jobId?: string) {
  const qs = jobId ? `?job_id=${jobId}` : ''
  return request(`/candidates/${candidateId}${qs}`)
}

// --- Applications ---
export async function applyToJob(candidateId: string, jobId: string) {
  const form = new FormData()
  form.append('candidate_id', candidateId)
  form.append('job_id', jobId)
  return request('/applications', { method: 'POST', body: form })
}

export async function getJobApplications(jobId: string) {
  return request(`/jobs/${jobId}/applications`)
}

export async function getAllEmployerApplications(employerId: string) {
  return request(`/employers/${employerId}/applications`)
}

export async function searchCandidatesAI(employerId: string, query: string) {
  const form = new FormData()
  form.append('query', query)
  return request(`/employers/${employerId}/candidates/search`, { method: 'POST', body: form })
}

export async function guidedExtractJD(description: string, qa: { q: string; a: string }[]) {
  const form = new FormData()
  form.append('description', description)
  form.append('qa', JSON.stringify(qa))
  return request('/jobs/guided-extract', { method: 'POST', body: form })
}

export async function getCandidateApplications(candidateId: string) {
  return request(`/candidates/${candidateId}/applications`)
}

export async function updateApplicationStatus(applicationId: string, status: string) {
  const form = new FormData()
  form.append('status', status)
  return request(`/applications/${applicationId}/status`, { method: 'PATCH', body: form })
}

// --- Questions ---
export async function getQuestions() {
  return request('/questions')
}

// --- Interviews ---
export async function createInterview(data: {
  candidate_id: string
  job_id: string
  questions: { question_id: string; question_text: string }[]
  answers: Record<string, string>
}) {
  const form = new FormData()
  form.append('candidate_id', data.candidate_id)
  form.append('job_id', data.job_id)
  form.append('questions', JSON.stringify(data.questions))
  form.append('answers', JSON.stringify(data.answers))
  return request('/interviews', { method: 'POST', body: form })
}

export async function getInterview(interviewId: string) {
  return request(`/interviews/${interviewId}`)
}

// --- User profiles ---
export async function getUserProfile(userId: string) {
  return request(`/users/${userId}/profile`)
}

// --- Email verification ---
export async function verifyEmail(token: string) {
  const form = new FormData()
  form.append('token', token)
  return request('/auth/verify-email', { method: 'POST', body: form })
}

export async function resendVerification() {
  return request('/auth/resend-verification', { method: 'POST' })
}

export async function createVideoInterview(data: {
  candidate_id: string
  job_id: string
  questions: { question_id: string; question_text: string }[]
  transcripts: Record<string, string>
  videos: { questionId: string; blob: Blob }[]
}) {
  const form = new FormData()
  form.append('candidate_id', data.candidate_id)
  form.append('job_id', data.job_id)
  form.append('questions', JSON.stringify(data.questions))
  form.append('transcripts', JSON.stringify(data.transcripts))
  form.append('video_question_ids', JSON.stringify(data.videos.map(v => v.questionId)))
  for (const v of data.videos) {
    form.append('videos', v.blob, `${v.questionId}.webm`)
  }
  return request('/interviews/video', { method: 'POST', body: form })
}
