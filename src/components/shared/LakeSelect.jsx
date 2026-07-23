import { useState, useRef, useEffect } from 'react'
import { lakes } from '../../data/lakes'

export default function LakeSelect({ value, onChange, className = '', inputClassName = '' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  const selected = lakes.find((l) => l.id === value) || null

  const filtered = query.trim()
    ? lakes.filter((l) =>
        l.name.toLowerCase().includes(query.toLowerCase()) ||
        l.state.toLowerCase().includes(query.toLowerCase())
      )
    : lakes

  function pick(lake) {
    onChange(lake.id)
    setQuery('')
    setOpen(false)
  }

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const inputBase =
    'w-full bg-[#0a0900] border border-[#2a2000] rounded px-3 py-2 text-sm text-[#f0e8c8] focus:outline-none focus:border-[#c8a030] transition-colors placeholder-[#a08040]'

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {open ? (
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to search lakes…"
          className={`${inputBase} ${inputClassName}`}
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${inputBase} text-left flex items-center justify-between ${inputClassName}`}
        >
          <span style={{ color: selected ? '#f0e8c8' : '#a08040' }}>
            {selected ? `${selected.name} — ${selected.state}` : 'Select a lake…'}
          </span>
          <span className="text-[#a08040] ml-2 shrink-0">▾</span>
        </button>
      )}

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded border overflow-y-auto"
          style={{
            backgroundColor: '#111008',
            borderColor: '#2a2000',
            maxHeight: '220px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          }}
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-sm text-[#a08040]">No lakes match.</p>
          ) : (() => {
            const rows = []
            let lastGroup = null
            filtered.forEach((l) => {
              if (l.group && l.group !== lastGroup) {
                rows.push({ type: 'header', label: l.group })
                lastGroup = l.group
              }
              rows.push({ type: 'lake', lake: l })
            })
            return rows.map((row) =>
              row.type === 'header' ? (
                <div
                  key={`grp-${row.label}`}
                  className="px-3 py-1.5 text-xs font-semibold tracking-wider uppercase"
                  style={{ color: '#c8a030', backgroundColor: '#0d0b04', borderTop: '1px solid #2a2000' }}
                >
                  {row.label}
                </div>
              ) : (
                <button
                  key={row.lake.id}
                  type="button"
                  onMouseDown={() => pick(row.lake)}
                  className="w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-[#1a1000] flex items-center justify-between"
                  style={{
                    color: row.lake.id === value ? '#f0c84a' : '#f0e8c8',
                    backgroundColor: row.lake.id === value ? '#1a1000' : 'transparent',
                  }}
                >
                  <span>{row.lake.name}</span>
                  <span className="text-xs ml-3 shrink-0" style={{ color: '#a08040' }}>{row.lake.state}</span>
                </button>
              )
            )
          })()}
        </div>
      )}
    </div>
  )
}
