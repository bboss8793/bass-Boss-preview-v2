export default function MascotHeader({ title, subtitle }) {
  const isLogo = title?.toLowerCase() === 'bass boss'

  return (
    <header className="text-center py-6 px-4 border-b border-[#2a2000]">
      <div className="flex justify-center mb-1">
        {isLogo ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '12px 0 4px' }}>
            <img src="/Logo-crest.png" alt="" style={{ height: '64px', width: 'auto' }} />
            <img src="/logo.png" alt="Bass Boss" style={{ height: '52px', width: 'auto' }} />
          </div>
        ) : (
          <h1 className="text-2xl md:text-3xl font-bold text-[#f0c84a] tracking-wide uppercase">
            {title}
          </h1>
        )}
      </div>
      {subtitle && (
        <p className="text-sm text-[#a08040] tracking-widest uppercase">{subtitle}</p>
      )}
    </header>
  )
}
