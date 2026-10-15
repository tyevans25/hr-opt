import type { CSSProperties } from 'react'

// Status badge
type BadgeVariant = 'new' | 'reviewed' | 'interview' | 'rejected'

const badgeStyles: Record<BadgeVariant, CSSProperties> = {
  new: { backgroundColor: '#EBF0F8', color: '#4A6FA5' },
  reviewed: { backgroundColor: '#EDF3EF', color: '#5C8B6E' },
  interview: { backgroundColor: '#E8F4FD', color: '#2E86AB' },
  rejected: { backgroundColor: '#FBF0EE', color: '#C4704F' },
}

const badgeLabels: Record<BadgeVariant, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  interview: 'Interview',
  rejected: 'Rejected',
}

export function StatusBadge({ status }: { status: BadgeVariant }) {
  return (
    <span
      style={{
        ...badgeStyles[status],
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: 20,
        letterSpacing: '0.02em',
        display: 'inline-block',
      }}
    >
      {badgeLabels[status]}
    </span>
  )
}

// Circular score
export function CircularScore({
  score,
  size = 52,
  accent = '#4A6FA5',
}: {
  score: number
  size?: number
  accent?: string
}) {
  const r = (size - 6) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (score / 100) * circumference

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E8E8E4" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size > 60 ? 18 : 13,
          fontWeight: 700,
          color: '#1A1A1A',
        }}
      >
        {score}
      </div>
    </div>
  )
}

// Horizontal bar chart row
export function ScoreBar({
  label,
  score,
  accent = '#4A6FA5',
  max = 100,
}: {
  label: string
  score: number
  accent?: string
  max?: number
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: '#6B6B6B' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{score}</span>
      </div>
      <div style={{ height: 5, backgroundColor: '#F0F0EC', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${(score / max) * 100}%`,
            backgroundColor: accent,
            borderRadius: 3,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  )
}

// Card wrapper
export function Card({ children, style, onClick, onMouseEnter, onMouseLeave }: { children: React.ReactNode; style?: CSSProperties; onClick?: () => void; onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void; onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void }) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// Styled JD renderer — parses ALL-CAPS section headers, bullet points, and paragraphs
export function JDBody({ text }: { text: string }) {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let key = 0
  let sectionIndex = 0

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      nodes.push(<div key={key++} style={{ height: 4 }} />)
      continue
    }

    const isHeader = trimmed === trimmed.toUpperCase() && /[A-Z]{2,}/.test(trimmed) && !trimmed.startsWith('•')
    if (isHeader) {
      nodes.push(
        <div key={key++} style={{
          fontSize: 10, fontWeight: 800, color: '#5C8B6E',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          marginTop: sectionIndex++ > 0 ? 22 : 0,
          marginBottom: 10,
          paddingBottom: 7,
          borderBottom: '1.5px solid #E4EFE8',
        }}>
          {trimmed}
        </div>
      )
      continue
    }

    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const content = trimmed.slice(1).trim()
      nodes.push(
        <div key={key++} style={{ display: 'flex', gap: 11, marginBottom: 7, alignItems: 'flex-start', paddingLeft: 2 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#5C8B6E', flexShrink: 0, marginTop: 8 }} />
          <span style={{ fontSize: 13, color: '#2A2A2A', lineHeight: 1.65 }}>{content}</span>
        </div>
      )
      continue
    }

    nodes.push(
      <p key={key++} style={{ fontSize: 13.5, color: '#3A3A3A', lineHeight: 1.8, margin: '0 0 10px 0' }}>
        {trimmed}
      </p>
    )
  }

  return <div>{nodes}</div>
}
