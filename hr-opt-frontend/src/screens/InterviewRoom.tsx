import { useEffect, useRef, useState } from 'react'
import type { Screen } from '../App'
import { getQuestions, createVideoInterview } from '../api'

interface Props {
  onNavigate: (screen: Screen) => void
  isMobile?: boolean
  candidateId: string | null
  jobId: string | null
}

const accent = '#C4704F'
const bg = '#111111'
const surface = '#1C1C1C'
const border = 'rgba(255,255,255,0.08)'
const QUESTION_TIME = 90
const MAX_TAKES = 2

type Stage = 'loading' | 'intro' | 'setup' | 'question' | 'reviewing' | 'submitting' | 'results' | 'error'

interface Question {
  question_id: string
  question_text: string
  category: string
}

interface Recording {
  questionId: string
  blob: Blob
  transcript: string
}

interface Results {
  summary: string
  strengths: string[]
  notable_answers: { question: string; highlight: string }[]
  flags: string[]
}

export default function InterviewRoom({ onNavigate, isMobile, candidateId, jobId }: Props) {
  const [stage, setStage] = useState<Stage>('loading')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [takeNumber, setTakeNumber] = useState(1)
  const [isRecording, setIsRecording] = useState(false)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [results, setResults] = useState<Results | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [cameraReady, setCameraReady] = useState(false)

  // Use refs to avoid stale closures in async callbacks
  const recordingsRef = useRef<Recording[]>([])
  const questionsRef = useRef<Question[]>([])
  const currentIdxRef = useRef(0)
  const pendingBlobRef = useRef<Blob | null>(null)
  const pendingTranscriptRef = useRef('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')

  // Keep refs in sync
  useEffect(() => { questionsRef.current = questions }, [questions])
  useEffect(() => { currentIdxRef.current = currentIdx }, [currentIdx])


  // Attach stream to video element once it's in the DOM (stage change makes it mount)
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [stage])

  // Load questions
  useEffect(() => {
    if (!candidateId || !jobId) {
      setStage('error')
      setErrorMsg('No job selected. Please apply to a job before starting the interview.')
      return
    }
    getQuestions()
      .then((data) => {
        const qs: Question[] = (data.questions || []).map((q: any) => ({
          question_id: q.id,
          question_text: q.customized_text || q.template,
          category: q.category,
        }))
        if (qs.length === 0) {
          setStage('error')
          setErrorMsg('No interview questions are available yet. Please check back later.')
          return
        }
        const fixed = qs.filter((q) => q.category === 'introduction')
        const rest = qs.filter((q) => q.category !== 'introduction')
        const shuffled = rest.sort(() => Math.random() - 0.5).slice(0, Math.max(0, 6 - fixed.length))
        const selected = [...fixed, ...shuffled]
        setQuestions(selected)
        questionsRef.current = selected
        setStage('intro')
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Could not load questions.')
        setStage('error')
      })
  }, [candidateId, jobId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer()
      stopCamera()
      stopSpeechRecognition()
    }
  }, [])

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraReady(false)
  }

  const stopSpeechRecognition = () => {
    try { recognitionRef.current?.stop() } catch {}
    recognitionRef.current = null
  }

  const startSpeechRecognition = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    try {
      const recognition = new SR()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      recognition.onresult = (e: any) => {
        let t = ''
        for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript
        transcriptRef.current = t
        setCurrentTranscript(t)
      }
      recognition.onerror = () => {}
      recognition.start()
      recognitionRef.current = recognition
    } catch {}
  }

  const doSubmitInterview = (finalRecordings: Recording[]) => {
    setStage('submitting')
    const qs = questionsRef.current
    const transcriptsMap: Record<string, string> = {}
    finalRecordings.forEach(r => { transcriptsMap[r.questionId] = r.transcript })

    createVideoInterview({
      candidate_id: candidateId!,
      job_id: jobId!,
      questions: qs.map(q => ({ question_id: q.question_id, question_text: q.question_text })),
      transcripts: transcriptsMap,
      videos: finalRecordings.map(r => ({ questionId: r.questionId, blob: r.blob })),
    })
      .then((data) => {
        setResults({
          summary: data.summary || '',
          strengths: data.strengths || [],
          notable_answers: data.notable_answers || [],
          flags: data.flags || [],
        })
        stopCamera()
        setStage('results')
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Failed to submit interview.')
        setStage('error')
      })
  }

  const saveRecordingAndAdvance = (qid: string, blob: Blob, transcript: string) => {
    const updated = [...recordingsRef.current.filter(r => r.questionId !== qid), { questionId: qid, blob, transcript }]
    recordingsRef.current = updated

    const nextIdx = currentIdxRef.current + 1
    if (nextIdx >= questionsRef.current.length) {
      doSubmitInterview(updated)
    } else {
      setCurrentIdx(nextIdx)
      setTakeNumber(1)
      setCurrentTranscript('')
      setStage('question')
    }
  }

  const startRecording = () => {
    if (!streamRef.current) return
    chunksRef.current = []
    transcriptRef.current = ''
    setCurrentTranscript('')
    setTimeLeft(QUESTION_TIME)

    const preferredTypes = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
    const mimeType = preferredTypes.find(t => MediaRecorder.isTypeSupported(t)) || ''
    const mr = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : {})
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.start(200)
    mediaRecorderRef.current = mr
    setIsRecording(true)
    startSpeechRecognition()

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up — stop and auto-advance
          stopAndFinalize(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const stopAndFinalize = (autoAdvance: boolean) => {
    stopTimer()
    stopSpeechRecognition()
    setIsRecording(false)

    const mr = mediaRecorderRef.current
    if (!mr || mr.state === 'inactive') return
    mediaRecorderRef.current = null

    const capturedTranscript = transcriptRef.current
    const capturedIdx = currentIdxRef.current
    const capturedQuestions = questionsRef.current

    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeTypeForBlob() })
      const qid = capturedQuestions[capturedIdx]?.question_id || ''

      if (autoAdvance) {
        saveRecordingAndAdvance(qid, blob, capturedTranscript)
      } else {
        pendingBlobRef.current = blob
        pendingTranscriptRef.current = capturedTranscript
        setStage('reviewing')
      }
    }
    mr.stop()
  }

  const mimeTypeForBlob = () => {
    const preferredTypes = ['video/webm', 'video/mp4']
    return preferredTypes.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm'
  }

  const handleStopRecording = () => stopAndFinalize(false)

  const handleKeepTake = () => {
    const blob = pendingBlobRef.current
    const transcript = pendingTranscriptRef.current
    const qid = questionsRef.current[currentIdxRef.current]?.question_id || ''
    if (!blob) return
    saveRecordingAndAdvance(qid, blob, transcript)
  }

  const handleRetake = () => {
    pendingBlobRef.current = null
    pendingTranscriptRef.current = ''
    setTakeNumber(2)
    setStage('question')
  }

  // Auto-start recording when question stage is active
  useEffect(() => {
    if (stage === 'question' && cameraReady) {
      startRecording()
    }
  }, [stage, currentIdx, cameraReady])

  const handleBeginSetup = async () => {
    setStage('setup')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      setCameraReady(true)
      setStage('question')
    } catch {
      setStage('error')
      setErrorMsg('Camera or microphone access was denied. Please allow access in your browser settings and try again.')
    }
  }

  const currentQ = questionsRef.current[currentIdx] || questions[currentIdx]
  const progressPct = questions.length ? (currentIdx / questions.length) * 100 : 0
  const timerPct = (timeLeft / QUESTION_TIME) * 100
  const timerColor = timeLeft > 30 ? '#5C8B6E' : timeLeft > 10 ? '#C4A44F' : '#C4704F'
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div style={{ minHeight: '100vh', backgroundColor: bg, color: '#FAFAF7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

      {/* Loading */}
      {stage === 'loading' && (
        <div style={{ textAlign: 'center' }}>
          <div style={spinner} />
          <p style={{ color: '#666', fontSize: 14 }}>Loading interview...</p>
        </div>
      )}

      {/* Error */}
      {stage === 'error' && (
        <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Something went wrong</h2>
          <p style={{ color: '#888', fontSize: 14, lineHeight: 1.65, marginBottom: 28 }}>{errorMsg}</p>
          <button onClick={() => onNavigate('job-browser')} style={ghostBtn}>Browse Jobs</button>
        </div>
      )}

      {/* Intro */}
      {stage === 'intro' && (
        <div style={{ textAlign: 'center', maxWidth: 520, padding: '0 24px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', backgroundColor: `${accent}18`, border: `1.5px solid ${accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', fontSize: 28 }}>🎥</div>
          <h1 style={{ fontSize: isMobile ? 26 : 32, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 14 }}>Video Interview</h1>
          <p style={{ color: '#999', fontSize: 15, lineHeight: 1.75, marginBottom: 8 }}>
            You'll answer <strong style={{ color: '#FAFAF7' }}>{questions.length} questions</strong> on camera. Each question gives you <strong style={{ color: '#FAFAF7' }}>{QUESTION_TIME / 60} minutes</strong> and <strong style={{ color: '#FAFAF7' }}>{MAX_TAKES} takes</strong>.
          </p>
          <p style={{ color: '#555', fontSize: 13, lineHeight: 1.6, marginBottom: 36 }}>Find a quiet, well-lit space. We'll ask for camera and microphone access on the next screen.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <button onClick={handleBeginSetup} style={{ backgroundColor: accent, border: 'none', borderRadius: 10, color: 'white', fontSize: 15, fontWeight: 700, padding: '13px 40px', cursor: 'pointer' }}>Start Interview</button>
            <button onClick={() => onNavigate('job-browser')} style={{ ...ghostBtn, fontSize: 13, padding: '8px 20px' }}>← Back to Jobs</button>
          </div>
        </div>
      )}

      {/* Camera setup */}
      {stage === 'setup' && (
        <div style={{ textAlign: 'center' }}>
          <div style={spinner} />
          <p style={{ color: '#666', fontSize: 14 }}>Initializing camera...</p>
        </div>
      )}

      {/* Question / Recording / Reviewing */}
      {(stage === 'question' || stage === 'reviewing') && (
        <div style={{ width: '100%', maxWidth: 800, padding: isMobile ? '16px' : '24px 32px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                Question {currentIdx + 1} of {questions.length}
                {takeNumber === 2 && <span style={{ color: accent, marginLeft: 8 }}>· Take 2</span>}
              </div>
              <div style={{ height: 3, width: isMobile ? 160 : 240, backgroundColor: '#2A2A2A', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, backgroundColor: accent, borderRadius: 10, transition: 'width 0.4s ease' }} />
              </div>
            </div>
            <button onClick={() => { stopAndFinalize(false); stopCamera(); onNavigate('job-browser') }} style={{ background: 'none', border: 'none', color: '#444', fontSize: 13, cursor: 'pointer' }}>Exit ×</button>
          </div>

          {/* Question text */}
          <div style={{ backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? '16px 18px' : '20px 26px', marginBottom: 20 }}>
            <p style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, lineHeight: 1.55, color: '#F0F0F0', margin: 0 }}>{currentQ?.question_text}</p>
          </div>

          {/* Video + sidebar */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, flex: 1, marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: 1, backgroundColor: '#0D0D0D', borderRadius: 16, overflow: 'hidden', border: `1px solid ${isRecording ? accent + '55' : border}`, minHeight: isMobile ? 220 : 300, transition: 'border-color 0.2s' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }} />
              {isRecording && (
                <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 20, padding: '4px 10px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#E54D4D', animation: 'pulse 1.1s ease-in-out infinite' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#FAFAF7', letterSpacing: '0.06em' }}>REC</span>
                </div>
              )}
              {isRecording && (
                <div style={{ position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 20, padding: '4px 12px' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: timerColor, fontVariantNumeric: 'tabular-nums' }}>{fmt(timeLeft)}</span>
                </div>
              )}
              {stage === 'reviewing' && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
                    <div style={{ fontSize: 13, color: '#CCC' }}>Recording saved</div>
                  </div>
                </div>
              )}
            </div>

            {!isMobile && (
              <div style={{ width: 200, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 14, padding: '16px', textAlign: 'center' }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" style={{ display: 'block', margin: '0 auto 8px' }}>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#2A2A2A" strokeWidth="5" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke={timerColor} strokeWidth="5"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - timerPct / 100)}`}
                      strokeLinecap="round" transform="rotate(-90 40 40)"
                      style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }} />
                    <text x="40" y="45" textAnchor="middle" fill={timerColor} fontSize="16" fontWeight="700" fontFamily="inherit">{fmt(timeLeft)}</text>
                  </svg>
                  <div style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>time remaining</div>
                </div>
                <div style={{ flex: 1, backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 14, padding: '12px 14px', overflow: 'hidden' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Live transcript</div>
                  <p style={{ fontSize: 12, color: currentTranscript ? '#999' : '#333', lineHeight: 1.6, margin: 0, fontStyle: currentTranscript ? 'normal' : 'italic' }}>
                    {currentTranscript || 'Start speaking…'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, paddingBottom: isMobile ? 20 : 28 }}>
            {stage === 'question' && isRecording && (
              <button onClick={handleStopRecording} style={{ backgroundColor: '#2A2A2A', border: `1px solid ${border}`, borderRadius: 10, color: '#FAFAF7', fontSize: 14, fontWeight: 700, padding: '12px 28px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#E54D4D' }} />
                Stop Recording
              </button>
            )}
            {stage === 'reviewing' && (
              <>
                {takeNumber < MAX_TAKES && (
                  <button onClick={handleRetake} style={ghostBtn}>↺ Retake (Take 2)</button>
                )}
                <button onClick={handleKeepTake} style={{ backgroundColor: accent, border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 700, padding: '12px 28px', cursor: 'pointer' }}>
                  {currentIdx < questions.length - 1 ? 'Keep & Next →' : 'Keep & Submit'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Submitting */}
      {stage === 'submitting' && (
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <div style={spinner} />
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Uploading your interview...</h2>
          <p style={{ color: '#666', fontSize: 14 }}>Hang tight — this may take a moment.</p>
        </div>
      )}

      {/* Results */}
      {stage === 'results' && results && (
        <div style={{ width: '100%', maxWidth: 640, padding: isMobile ? '28px 16px' : '40px 24px', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: '#1A2A20', border: '1.5px solid #5C8B6E44', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 26 }}>✓</div>
            <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 10 }}>Interview Submitted</h1>
            <p style={{ color: '#777', fontSize: 14 }}>Your responses are in. The hiring team will follow up.</p>
          </div>
          <div style={{ backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 14, padding: '20px 22px', marginBottom: 14 }}>
            <div style={label}>Summary</div>
            <p style={{ fontSize: 14, color: '#DEDEDE', lineHeight: 1.75, margin: 0 }}>{results.summary}</p>
          </div>
          {results.strengths.length > 0 && (
            <div style={{ backgroundColor: '#162019', border: '1px solid #5C8B6E28', borderRadius: 14, padding: '20px 22px', marginBottom: 14 }}>
              <div style={{ ...label, color: '#5C8B6E' }}>Strengths Noted</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {results.strengths.map((s, i) => <li key={i} style={{ fontSize: 14, color: '#C8C8C8', lineHeight: 1.55 }}>{s}</li>)}
              </ul>
            </div>
          )}
          {results.notable_answers.length > 0 && (
            <div style={{ backgroundColor: surface, border: `1px solid ${border}`, borderRadius: 14, padding: '20px 22px', marginBottom: 14 }}>
              <div style={label}>Standout Moments</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {results.notable_answers.map((na, i) => (
                  <div key={i} style={{ borderLeft: `2px solid ${accent}66`, paddingLeft: 14 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{na.question}</div>
                    <div style={{ fontSize: 13, color: '#DEDEDE', lineHeight: 1.55 }}>{na.highlight}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {results.flags.length > 0 && (
            <div style={{ backgroundColor: '#1F1612', border: '1px solid #C4704F28', borderRadius: 14, padding: '20px 22px', marginBottom: 14 }}>
              <div style={{ ...label, color: '#C4704F' }}>Areas to Explore</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {results.flags.map((f, i) => <li key={i} style={{ fontSize: 14, color: '#C8C8C8', lineHeight: 1.55 }}>{f}</li>)}
              </ul>
            </div>
          )}
          <button onClick={() => onNavigate('job-browser')} style={{ ...ghostBtn, width: '100%', marginTop: 8, padding: '13px' }}>Back to Browse Jobs</button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  )
}

const ghostBtn: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#FAFAF7',
  fontSize: 14,
  fontWeight: 600,
  padding: '11px 24px',
  cursor: 'pointer',
}

const label: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#555',
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  marginBottom: 12,
}

const spinner: React.CSSProperties = {
  width: 44,
  height: 44,
  border: '3px solid rgba(196,112,79,0.2)',
  borderTopColor: '#C4704F',
  borderRadius: '50%',
  margin: '0 auto 20px',
  animation: 'spin 0.9s linear infinite',
}
