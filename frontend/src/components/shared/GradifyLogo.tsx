interface GradifyLogoProps {
  size?: number
  showWordmark?: boolean
  className?: string
}

// Brand mark: a rounded indigo→violet tile holding a graduation cap, next to
// the "Gradify" wordmark with an indigo accent dot. Shared visual language with
// the exported paper cover (see backend/app/services/pdf_service.py).
export default function GradifyLogo({
  size = 40,
  showWordmark = true,
  className = '',
}: GradifyLogoProps) {
  const gid = 'gradify-mark-grad'
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="Gradify">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill={`url(#${gid})`} />
        {/* Mortarboard cap */}
        <path d="M24 13 L40 20 L24 27 L8 20 Z" fill="#fff" />
        <path
          d="M15 22.5 V29.5 C15 32.6 33 32.6 33 29.5 V22.5"
          stroke="#fff"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        {/* Tassel */}
        <path d="M40 20 V30" stroke="#c7d2fe" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="40" cy="31.5" r="2" fill="#c7d2fe" />
      </svg>
      {showWordmark && (
        <span
          className="font-bold tracking-tight text-slate-900"
          style={{ fontSize: size * 0.55 }}
        >
          Gradify<span className="text-indigo-500">.</span>
        </span>
      )}
    </div>
  )
}
