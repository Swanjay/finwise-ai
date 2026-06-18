/**
 * FinWise Logo — 3D Cat Mascot
 * Uses the 3D cat mascot as the logo
 * Props: size (height in px), showText, className
 */
import Image from 'next/image'

export default function FinWiseLogo({
  size = 80,
  showText = true,
  className = "",
}: {
  size?: number
  showText?: boolean
  className?: string
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/mascot-128.png"
        alt="FinWise"
        width={size}
        height={size}
        className="drop-shadow-lg"
        priority
      />
      {showText && (
        <span
          className="font-bold tracking-tight"
          style={{ fontSize: size * 0.4 }}
        >
          <span className="text-primary">Fin</span>
          <span className="text-[#2D2057] opacity-80">Wise</span>
        </span>
      )}
    </div>
  )
}
