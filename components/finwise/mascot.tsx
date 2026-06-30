'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

// ─── Mascot States ───
type MascotState = 'happy' | 'sad' | 'loading' | 'celebrating' | 'thinking'

interface FinWiseMascotProps {
  size?: 64 | 128 | 256 | 512
  state?: MascotState
  message?: string
  className?: string
  animate?: boolean
}

// ─── Mascot Component ───
export function FinWiseMascot({ 
  size = 128, 
  state = 'happy',
  message, 
  className = '',
  animate = false
}: FinWiseMascotProps) {
  const animations = {
    happy: {
      y: [0, -10, 0],
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const }
    },
    sad: {
      y: [0, 5, 0],
      rotate: [0, -5, 5, 0],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const }
    },
    loading: {
      x: [0, 20, 0, -20, 0],
      transition: { duration: 1.5, repeat: Infinity, ease: "linear" as const }
    },
    celebrating: {
      y: [0, -20, 0],
      scale: [1, 1.1, 1],
      transition: { duration: 0.6, repeat: Infinity, ease: "easeOut" as const }
    },
    thinking: {
      rotate: [0, 10, -10, 0],
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const }
    }
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <motion.div
        animate={animate ? animations[state] : {}}
        className="relative"
      >
        <Image
          src="/mascot-128.png?v=2"
          alt="FinWise Cat"
          width={size}
          height={size}
          className="drop-shadow-lg"
          priority
        />
        
        {/* State indicators */}
        {state === 'sad' && (
          <div className="absolute -top-2 -right-2 text-2xl">😢</div>
        )}
        {state === 'celebrating' && (
          <div className="absolute -top-2 -right-2 text-2xl">🎉</div>
        )}
        {state === 'thinking' && (
          <div className="absolute -top-2 -right-2 text-2xl">💭</div>
        )}
      </motion.div>
      
      {message && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-muted-foreground text-center max-w-[200px]"
        >
          {message}
        </motion.p>
      )}
    </div>
  )
}

// ─── Empty State ───
export function EmptyState({ 
  title = 'Belum ada data', 
  description = 'Mulai catat transaksi pertamamu!',
  showMascot = true,
  action
}: {
  title?: string
  description?: string
  showMascot?: boolean
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {showMascot && (
        <FinWiseMascot 
          size={128} 
          state="thinking"
          message={description}
          animate
        />
      )}
      <h3 className="text-lg font-semibold mt-4">{title}</h3>
      {!showMascot && (
        <p className="text-sm text-muted-foreground text-center mt-2">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── Loading Screen ───
export function LoadingScreen({ message = 'Memuat data...' }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[998] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <FinWiseMascot 
        size={128} 
        state="loading" 
        message={message}
        animate 
      />
      
      {/* Loading dots */}
      <div className="flex gap-2 mt-6">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 rounded-full bg-primary"
            animate={{
              y: [0, -10, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}

// ─── Error State ───
export function ErrorState({ 
  title = 'Terjadi kesalahan',
  description = 'Ups! Ada yang tidak beres. Coba lagi ya!',
  onRetry
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <FinWiseMascot 
        size={128} 
        state="sad"
        message={description}
        animate
      />
      <h3 className="text-lg font-semibold mt-4 text-destructive">{title}</h3>
      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          className="mt-4 px-6 py-2 rounded-full bg-primary text-primary-foreground font-medium"
        >
          Coba Lagi
        </motion.button>
      )}
    </div>
  )
}

// ─── Achievement Badge ───
interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
}

export function AchievementBadge({ achievement }: { achievement: Achievement }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`flex items-center gap-3 p-3 rounded-xl border ${
        achievement.unlocked 
          ? 'border-primary/30 bg-primary/5' 
          : 'border-muted opacity-50'
      }`}
    >
      <div className="text-3xl">{achievement.icon}</div>
      <div>
        <h4 className="font-medium text-sm">{achievement.title}</h4>
        <p className="text-xs text-muted-foreground">{achievement.description}</p>
      </div>
      {achievement.unlocked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="ml-auto text-primary"
        >
          ✓
        </motion.div>
      )}
    </motion.div>
  )
}

export function AchievementsList({ achievements }: { achievements: Achievement[] }) {
  return (
    <div className="space-y-2">
      <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
        🏆 Pencapaian
      </h3>
      <div className="grid gap-2">
        {achievements.map((achievement) => (
          <AchievementBadge key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </div>
  )
}

// ─── About Page ───
export function AboutPage() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 max-w-md mx-auto">
      <FinWiseMascot 
        size={256} 
        state="happy"
        animate
      />
      
      <h1 className="text-2xl font-heading font-bold mt-6">
        <span className="text-primary">Fin</span>
        <span className="text-foreground">Wise</span>
      </h1>
      
      <p className="text-muted-foreground text-center mt-2">
        Catat Keuangan Lebih Pintar
      </p>
      
      <div className="mt-6 space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          FinWise adalah aplikasi keuangan pribadi yang membantu kamu mengelola 
          uang dengan lebih bijak. Dengan fitur AI yang cerdas, FinWise siap 
          menjadi teman finansialmu!
        </p>
        
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-primary">v</span>
            <span>2.0.0</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🐱</span>
            <span>Mascot: Finny</span>
          </div>
        </div>
        
        <div className="pt-4 border-t border-muted">
          <p className="text-xs text-muted-foreground">
            Dibuat dengan ❤️ oleh San
          </p>
        </div>
      </div>
    </div>
  )
}
