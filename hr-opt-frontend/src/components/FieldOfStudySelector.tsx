import { useState } from 'react'
import { FIELD_OF_STUDY_OPTIONS, FIELD_CATEGORIES, getLabelForValue } from '../data/fieldOfStudy'

interface Props {
  selected: string[]
  onChange: (values: string[]) => void
  label?: string
  hint?: string
}

const accentColor = '#5C8B6E'

export default function FieldOfStudySelector({ selected, onChange, label = 'Field of Study', hint }: Props) {
  const [open, setOpen] = useState(false)

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B6B6B', marginBottom: 6 }}>
        {label}
      </label>
      {hint && <p style={{ fontSize: 11, color: '#ABABAB', marginBottom: 8 }}>{hint}</p>}

      {/* Selected tags */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {selected.map((v) => (
            <span key={v} style={{
              backgroundColor: '#EDF3EF', color: accentColor,
              fontSize: 12, fontWeight: 500, padding: '4px 10px',
              borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6
            }}>
              {getLabelForValue(v)}
              <button
                onClick={() => toggle(v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: accentColor, fontSize: 14, padding: 0, lineHeight: 1 }}
              >×</button>
            </span>
          ))}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 8,
          border: '1px solid #E8E8E4', backgroundColor: '#FAFAF7',
          fontSize: 13, color: '#6B6B6B', cursor: 'pointer',
          textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}
      >
        <span>{selected.length === 0 ? 'Select fields of study...' : `${selected.length} selected`}</span>
        <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          border: '1px solid #E8E8E4', borderRadius: 8, backgroundColor: '#FFFFFF',
          marginTop: 4, maxHeight: 320, overflowY: 'auto',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
        }}>
          {FIELD_CATEGORIES.map((category) => (
            <div key={category}>
              <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, color: '#ABABAB', letterSpacing: '0.08em', textTransform: 'uppercase', backgroundColor: '#FAFAF7' }}>
                {category}
              </div>
              {FIELD_OF_STUDY_OPTIONS.filter(f => f.category === category).map((field) => (
                <div
                  key={field.value}
                  onClick={() => toggle(field.value)}
                  style={{
                    padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 10,
                    backgroundColor: selected.includes(field.value) ? '#EDF3EF' : 'transparent',
                    color: selected.includes(field.value) ? accentColor : '#1A1A1A',
                  }}
                  onMouseEnter={(e) => { if (!selected.includes(field.value)) e.currentTarget.style.backgroundColor = '#F5F5F2' }}
                  onMouseLeave={(e) => { if (!selected.includes(field.value)) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${selected.includes(field.value) ? accentColor : '#D4D4CE'}`,
                    backgroundColor: selected.includes(field.value) ? accentColor : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    {selected.includes(field.value) && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  {field.label}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
