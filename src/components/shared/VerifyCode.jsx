import { useState } from 'react'
import { generateVerifyCode, validateCode, obfuscateCode } from '../../utils/verifyCode'

export default function VerifyCode({ onVerified, label = 'Enter the code to confirm' }) {
  const [code] = useState(() => generateVerifyCode())
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (validateCode(input, code)) {
      setError(false)
      onVerified?.()
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[#a08040] text-sm">{label}</p>
      <div className="bg-[#0a0900] border border-[#2a2000] rounded px-4 py-2 text-center">
        <span className="text-[#f0c84a] font-bold tracking-widest text-lg select-all">{code}</span>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false) }}
          placeholder="Type code above…"
          className="flex-1 bg-[#0a0900] border border-[#2a2000] rounded px-3 py-2 text-[#f0e8c8] text-sm focus:outline-none focus:border-[#c8a030] transition-colors"
        />
        <button
          type="submit"
          className="bg-[#c8a030] hover:bg-[#f0c84a] text-[#0a0900] font-bold px-4 py-2 rounded text-sm transition-colors"
        >
          Confirm
        </button>
      </form>
      {error && (
        <p className="text-[#ef4444] text-sm">Code does not match. Try again.</p>
      )}
    </div>
  )
}
