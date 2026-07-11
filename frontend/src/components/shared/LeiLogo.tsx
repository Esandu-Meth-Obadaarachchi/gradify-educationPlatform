interface LeiLogoProps {
  size?: number
  /** full = mark + "LEI" + full name · compact = mark + "LEI" · false = mark only */
  wordmark?: 'full' | 'compact' | false
  /** true when placed on a dark surface (navbar / login) so text is light */
  onDark?: boolean
  className?: string
}

// Brand navy from the London Educational Institute logo.
export const LEI_NAVY = '#1e3a8a'

// Mark: a navy rounded tile with the white "Lei" wordmark, matching the LEI
// logo. Kept in sync with the exported paper cover (backend pdf_service.py).
export default function LeiLogo({
  size = 40,
  wordmark = 'full',
  onDark = false,
  className = '',
}: LeiLogoProps) {
  const textColor = onDark ? 'text-white' : 'text-slate-900'
  const subColor = onDark ? 'text-slate-300' : 'text-slate-500'
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="flex shrink-0 items-center justify-center rounded-xl font-bold leading-none text-white ring-1 ring-white/10"
        style={{ width: size, height: size, backgroundColor: LEI_NAVY, fontSize: size * 0.46 }}
      >
        Lei
      </div>
      {wordmark && (
        <div className="flex flex-col leading-tight">
          <span className={`font-bold tracking-tight ${textColor}`} style={{ fontSize: size * 0.5 }}>
            LEI
          </span>
          {wordmark === 'full' && (
            <span
              className={`font-medium uppercase tracking-[0.12em] ${subColor}`}
              style={{ fontSize: size * 0.2 }}
            >
              London Educational Institute
            </span>
          )}
        </div>
      )}
    </div>
  )
}
