import { useRef, useState } from 'react'

export default function PhotoCapture({ onCapture, label = 'Add Photo' }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    onCapture?.(file, url)
  }

  function handleClear() {
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
    onCapture?.(null, null)
  }

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt="Captured"
            className="w-full rounded-lg border border-[#2a2000] object-cover max-h-64"
          />
          <button
            onClick={handleClear}
            className="absolute top-2 right-2 bg-[#0a0900]/80 border border-[#ef4444] text-[#ef4444] text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-[#2a2000] hover:border-[#c8a030] rounded-lg py-8 text-center text-[#a08040] hover:text-[#c8a030] transition-colors text-sm"
        >
          <div className="text-2xl mb-1">📷</div>
          {label}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  )
}
