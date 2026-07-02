'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Sparkles, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PLANS, type PlanTier, type PlanWithFeatures, type FeatureWithIncluded, savePlan, loadPlan } from '@/lib/plans'

function PricingCard({ plan, isCurrent, onSelect }: {
  plan: PlanWithFeatures
  isCurrent: boolean
  onSelect: (id: PlanTier) => void
}) {
  const features = plan.features as FeatureWithIncluded[]
  const isPopular = plan.id === 'pro'
  const isPremium = plan.id === 'premium'

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all duration-300',
      isCurrent && 'ring-2 ring-primary shadow-lg shadow-primary/20',
      !isCurrent && 'hover:shadow-md hover:-translate-y-0.5',
    )}>
      {isPopular && (
        <div className="absolute top-0 right-0">
          <div className="bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl">
            POPULER
          </div>
        </div>
      )}
      <CardContent className="p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="text-center">
          <span className="text-2xl">{plan.badge}</span>
          <h3 className="font-heading text-lg font-bold mt-1">{plan.name}</h3>
          <div className="mt-2">
            {plan.price === 0 ? (
              <span className="text-2xl font-bold">Gratis</span>
            ) : (
              <>
                <span className="text-2xl font-bold">{plan.price.toLocaleString('id-ID')}</span>
                <span className="text-xs text-muted-foreground ml-1">/bln</span>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        {plan.description && (
          <div className="text-center text-xs text-muted-foreground px-2 py-2 rounded-lg bg-secondary/50 border border-border">
            💡 {plan.description}
          </div>
        )}

        {/* Features */}
        <div className="flex flex-col gap-1.5">
          {features.map((f: FeatureWithIncluded) => (
            <div key={f.key} className="flex items-center gap-2 text-xs">
              {f.included ? (
                <>
                  <Check className="size-3.5 text-emerald-500 shrink-0" />
                  <span className="text-foreground/80">
                    {f.label}{' '}
                    {typeof f.free === 'number' && plan.id === 'basic' && (
                      <span className="text-muted-foreground">({f.free}×)</span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span className="size-3.5 shrink-0 text-muted-foreground/30">—</span>
                  <span className="text-muted-foreground/40">{f.label}</span>
                </>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <Button
          onClick={() => onSelect(plan.id)}
          variant={isCurrent ? 'outline' : isPremium ? 'default' : 'secondary'}
          className={cn(
            'w-full mt-1',
            isCurrent && 'border-primary/50 text-primary',
          )}
        >
          {isCurrent ? '✓ Paket Saat Ini' : plan.price === 0 ? 'Pilih Gratis' : `Pilih ${plan.name}`}
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Upgrade Modal Component ───
export function UpgradeModal({ featureKey, onClose }: { featureKey: string; onClose: () => void }) {
  const { getUpgradeMessage } = require('@/lib/plans')

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-6">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 text-center">
        <div className="text-3xl">🔒</div>
        <h2 className="font-heading text-lg font-bold">Fitur Premium</h2>
        <p className="text-sm text-muted-foreground">
          {getUpgradeMessage(featureKey)}
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Link href="/pricing">
            <Button className="w-full gap-2">
              <Sparkles className="size-4" /> Lihat Paket Harga
            </Button>
          </Link>
          <Button variant="ghost" onClick={onClose}>Nanti Saja</Button>
        </div>
      </div>
    </div>
  )
}

export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState<PlanTier>(loadPlan())
  const [animating, setAnimating] = useState<PlanTier | null>(null)
  const [showConfirm, setShowConfirm] = useState<PlanTier | null>(null)

  async function handleSelect(planId: PlanTier) {
    if (planId === currentPlan) return

    if (planId === 'basic') {
      // Confirm before downgrading
      setShowConfirm('basic')
      return
    }

    // Pro/Premium — initiate payment
    setAnimating(planId)
    
    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan_tier: planId,
          payment_method: 'midtrans' // or whatever payment gateway
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Payment initiation failed')
      }
      
      // Redirect to payment processor
      window.location.href = data.redirect_url
    } catch (error) {
      console.error('Payment error:', error)
      setAnimating(null)
      alert('Gagal memproses pembayaran: ' + (error as Error).message)
    }
  }

  function confirmDowngrade() {
    const planId = 'basic'
    setAnimating(planId)
    setTimeout(() => {
      savePlan(planId)
      setCurrentPlan(planId)
      setAnimating(null)
      setShowConfirm(null)
    }, 800)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-accent" /> FinWise AI
            </p>
            <h1 className="font-heading text-xl font-bold">Paket Harga</h1>
          </div>
        </div>
        <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
          {currentPlan === 'basic' ? '🆓 Basic' : currentPlan === 'pro' ? '💎 Pro' : '👑 Premium'}
        </span>
      </div>

      {/* Subtitle */}
      <p className="text-sm text-muted-foreground mb-6">
        Pilih paket yang sesuai dengan kebutuhan keuangan kamu.
      </p>

      {/* Plans Grid */}
      <div className="flex flex-col gap-3">
        {PLANS.map((plan) => (
          <div key={plan.id} className={cn(
            'transition-all duration-300',
            animating === plan.id && 'opacity-50 scale-95',
          )}>
            <PricingCard
              plan={plan}
              isCurrent={currentPlan === plan.id}
              onSelect={handleSelect}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          🔒 Pembayaran aman via Midtrans (coming soon)
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Semua paket dapat diubah kapan saja
        </p>
      </div>

      {/* Feature Guide */}
      <div className="mt-8 space-y-4 border-t border-border pt-6">
        <h2 className="font-heading text-lg font-bold text-center">📋 Panduan Fitur</h2>
        <p className="text-xs text-muted-foreground text-center">
          Penjelasan lengkap setiap fitur yang tersedia di FinWise
        </p>

        <div className="space-y-3">
          {[
            {
              icon: '📝',
              title: 'Transaksi Bulanan',
              desc: 'Batas jumlah transaksi yang bisa kamu catat setiap bulan. Basic dibatasi 50 transaksi, Pro dan Premium tidak terbatas — cocok untuk bisnis kecil atau keluarga yang banyak transaksi.',
              tiers: 'Basic: 50/bulan | Pro: Unlimited | Premium: Unlimited',
            },
            {
              icon: '👛',
              title: 'Dompet & Rekening',
              desc: 'Kelola berbagai sumber keuangan dalam satu tempat. Pisahkan rekening bank, e-wallet, dan uang tunai. Basic hanya 1 dompet, Pro & Premium bisa multiple.',
              tiers: 'Basic: 1 dompet | Pro: Unlimited | Premium: Unlimited',
            },
            {
              icon: '🏷️',
              title: 'Kategori Custom',
              desc: 'Buat kategori pengeluaran sendiri seperti "Ngopi", "Nonton", "Hobi". Basic hanya 5 kategori, Pro & Premium bisa buat kategori sebanyak yang kamu mau.',
              tiers: 'Basic: 5 kategori | Pro: Unlimited | Premium: Unlimited',
            },
            {
              icon: '💰',
              title: 'Budgeting Per Kategori',
              desc: 'Atur batas pengeluaran untuk setiap kategori (makan, transport, hiburan). Dapatkan notifikasi saat hampir melebihi budget. Membantu kontrol pengeluaran bulanan.',
              tiers: 'Basic: ❌ | Pro: ✅ | Premium: ✅',
            },
            {
              icon: '🔄',
              title: 'Transaksi Berulang Otomatis',
              desc: 'Atur transaksi yang terjadi rutin — seperti gaji bulanan, langganan Netflix, atau cicilan. Input sekali, FinWise catat otomatis tiap bulan tanpa perlu input ulang.',
              tiers: 'Basic: ❌ | Pro: ✅ | Premium: ✅',
            },
            {
              icon: '🎯',
              title: 'Target Tabungan Cerdas',
              desc: 'Tentukan target nabung (beli motor, liburan, dana darurat) dan pantau progresnya. FinWise akan menghitung estimasi waktu tercapai berdasarkan pola menabung kamu.',
              tiers: 'Basic: ❌ | Pro: ✅ | Premium: ✅',
            },
            {
              icon: '📊',
              title: 'Laporan & Grafik Visual',
              desc: 'Lihat ringkasan keuangan dalam bentuk grafik interaktif — pie chart untuk kategori, bar chart untuk tren bulanan, dan line chart untuk perkembangan tabungan.',
              tiers: 'Basic: ❌ | Pro: ✅ | Premium: ✅',
            },
            {
              icon: '📥',
              title: 'Export Data (CSV)',
              desc: 'Download data transaksi dalam format CSV yang bisa dibuka di Excel atau Google Sheets. Cocok untuk analisis lanjutan atau laporan keuangan.',
              tiers: 'Basic: ❌ | Pro: ✅ | Premium: ✅',
            },
            {
              icon: '📄',
              title: 'Export Laporan PDF',
              desc: 'Generate laporan keuangan profesional dalam format PDF. Bisa di-custom dengan periode, kategori, dan format yang rapi. Cocok untuk keperluan administrasi atau pajak.',
              tiers: 'Basic: ❌ | Pro: ❌ | Premium: ✅',
            },
            {
              icon: '🤖',
              title: 'AI Financial Advisor',
              desc: 'Konsultan keuangan pribadi berbasis AI. Tanya tentang cara hemat, strategi investasi, atau analisis pengeluaran. Dapatkan saran personal berdasarkan data keuangan kamu.',
              tiers: 'Basic: ❌ | Pro: ❌ | Premium: ✅',
            },
            {
              icon: '📸',
              title: 'Scan Struk AI (OCR)',
              desc: 'Foto struk belanja, AI otomatis membaca dan mencatat setiap item sebagai transaksi. Tidak perlu input manual — hemat waktu untuk yang sering belanja.',
              tiers: 'Basic: ❌ | Pro: ❌ | Premium: ✅',
            },
            {
              icon: '👨‍👩‍👧‍👦',
              title: 'Household Sharing',
              desc: 'Kelola keuangan bersama keluarga atau teman serumah. Bagikan budget, catatan pengeluaran, dan target tabungan dalam satu akun household.',
              tiers: 'Basic: ❌ | Pro: ❌ | Premium: ✅',
            },
            {
              icon: '💸',
              title: 'Split Bill Bersama',
              desc: 'Split tagihan dengan teman — makan bareng, patungan hadiah, atau biaya jalan-jalan. FinWise hitung otomatis siapa bayar berapa dan tracking status pembayaran.',
              tiers: 'Basic: ❌ | Pro: ❌ | Premium: ✅',
            },
            {
              icon: '🏷️',
              title: 'Tags & Labeling',
              desc: 'Beri tag pada transaksi untuk filter dan analisis lebih detail. Misalnya tag "Urgent", "Bisnis", atau "Personal" untuk memisahkan pengeluaran pribadi dan usaha.',
              tiers: 'Basic: ❌ | Pro: ✅ | Premium: ✅',
            },
            {
              icon: '🔔',
              title: 'Notifikasi Pintar',
              desc: 'Pengingat otomatis untuk tagihan jatuh tempo, budget yang hampir habis, target nabung, atau transaksi tidak biasa. Bisa diatur sesuai preferensi.',
              tiers: 'Basic: ❌ | Pro: ✅ | Premium: ✅',
            },
            {
              icon: '🏆',
              title: 'Gamification & Badges',
              desc: 'Dapatkan badges dan achievements saat mencapai milestone keuangan — seperti "Hemat Sebulan", "Nabung 1 Juta", atau "Budget Master". Bikin kelola uang jadi lebih seru!',
              tiers: 'Basic: ✅ | Pro: ✅ | Premium: ✅',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-card/50 p-4 transition-all hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{feature.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {feature.desc}
                  </p>
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <span className="text-[10px] font-medium text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                      {feature.tiers}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Downgrade Confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-6">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 text-center">
            <div className="text-3xl">⚠️</div>
            <h2 className="font-heading text-lg font-bold">Turun ke Basic?</h2>
            <p className="text-sm text-muted-foreground">
              Kamu akan kehilangan akses ke fitur premium seperti:
            </p>
            <ul className="text-xs text-left space-y-1 text-muted-foreground">
              <li className="flex items-center gap-1.5">❌ Budget & target tabungan</li>
              <li className="flex items-center gap-1.5">❌ Laporan grafik</li>
              <li className="flex items-center gap-1.5">❌ Transaksi tak terbatas</li>
              <li className="flex items-center gap-1.5">❌ Multi-wallet & lainnya</li>
            </ul>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(null)}>
                Batal
              </Button>
              <Button variant="destructive" className="flex-1" onClick={confirmDowngrade}>
                Ya, Turunkan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Animation */}
      {animating && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="text-4xl animate-bounce">
              {animating === 'pro' ? '💎' : '👑'}
            </div>
            <p className="text-white font-bold text-lg">
              {animating === 'pro' ? 'Pro' : 'Premium'} Aktif!
            </p>
            <p className="text-white/60 text-sm">Nikmati semua fitur eksklusif</p>
          </div>
        </div>
      )}
    </div>
  )
}