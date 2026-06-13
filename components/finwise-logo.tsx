/**
 * FinWise Logo — adaptive SVG component.
 * Uses violet→cyan gradient matching the Dark Neon design system.
 * Props: size (height in px), showText, className
 */
export default function FinWiseLogo({
  size = 80,
  showText = true,
  className = "",
}: {
  size?: number
  showText?: boolean
  className?: string
}) {
  const w = showText ? size * 3.2 : size
  const h = size

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      className={className}
      style={{ width: "auto", height: h }}
    >
      <defs>
        {/* Main brand gradient: violet → cyan */}
        <linearGradient id="fw-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-primary, #a855f7)" />
          <stop offset="100%" stopColor="var(--color-accent, #06b6d4)" />
        </linearGradient>

        {/* Subtle glow filter */}
        <filter id="fw-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Inner icon gradient (lighter) */}
        <linearGradient id="fw-grad-inner" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>

      {/* ── Icon: rounded square with rising chart + sparkle ── */}
      <g filter="url(#fw-glow)">
        {/* Background rounded rect */}
        <rect
          x={h * 0.06}
          y={h * 0.1}
          width={h * 0.8}
          height={h * 0.8}
          rx={h * 0.2}
          fill="url(#fw-grad)"
          opacity="0.92"
        />

        {/* Rising chart bars */}
        <rect
          x={h * 0.24}
          y={h * 0.62}
          width={h * 0.12}
          height={h * 0.16}
          rx={h * 0.03}
          fill="white"
          opacity="0.85"
        />
        <rect
          x={h * 0.4}
          y={h * 0.48}
          width={h * 0.12}
          height={h * 0.3}
          rx={h * 0.03}
          fill="white"
          opacity="0.9"
        />
        <rect
          x={h * 0.56}
          y={h * 0.32}
          width={h * 0.12}
          height={h * 0.46}
          rx={h * 0.03}
          fill="white"
          opacity="0.95"
        />

        {/* Upward arrow tip */}
        <path
          d={`M${h * 0.62} ${h * 0.28} L${h * 0.72} ${h * 0.18} L${h * 0.74} ${h * 0.22}`}
          stroke="white"
          strokeWidth={h * 0.04}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.95"
        />

        {/* Sparkle star (top-right) */}
        <circle cx={h * 0.78} cy={h * 0.2} r={h * 0.04} fill="white" opacity="0.7" />
        <circle cx={h * 0.78} cy={h * 0.2} r={h * 0.02} fill="white" />
      </g>

      {showText && (
        <g>
          {/* "Fin" — bold, gradient fill */}
          <text
            x={h * 1.1}
            y={h * 0.65}
            fontFamily="'Inter', 'Sora', system-ui, sans-serif"
            fontWeight="800"
            fontSize={h * 0.48}
            fill="url(#fw-grad)"
            letterSpacing="-0.02em"
          >
            Fin
          </text>
          {/* "Wise" — regular, white with subtle opacity */}
          <text
            x={h * 2.06}
            y={h * 0.65}
            fontFamily="'Inter', 'Sora', system-ui, sans-serif"
            fontWeight="400"
            fontSize={h * 0.48}
            fill="white"
            opacity="0.88"
            letterSpacing="-0.01em"
          >
            Wise
          </text>
        </g>
      )}
    </svg>
  )
}
