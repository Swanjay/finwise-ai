'use client'

import Image from 'next/image'

interface FinWiseMascotProps {
  size?: 64 | 128 | 256 | 512
  message?: string
  className?: string
}

export function FinWiseMascot({ size = 128, message, className = '' }: FinWiseMascotProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <Image
        src={`/mascot-${size}.png`}
        alt="FinWise Cat Mascot"
        width={size}
        height={size}
        className="drop-shadow-lg"
        priority
      />
      {message && (
        <p className="text-sm text-muted-foreground text-center max-w-[200px]">
          {message}
        </p>
      )}
    </div>
  )
}

export function EmptyState({ 
  title = 'Belum ada data', 
  description = 'Mulai catat transaksi pertamamu!',
  showMascot = true 
}: {
  title?: string
  description?: string
  showMascot?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {showMascot && (
        <FinWiseMascot 
          size={128} 
          message={description}
        />
      )}
      <h3 className="text-lg font-semibold mt-4">{title}</h3>
      {!showMascot && (
        <p className="text-sm text-muted-foreground text-center mt-2">
          {description}
        </p>
      )}
    </div>
  )
}
