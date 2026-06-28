"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Camera, Loader2, Trash2, AlertTriangle, User, Mail, Phone, Calendar, Briefcase, Wallet, Target, Globe, Bell, Moon, Lock, BarChart3 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FinwiseProvider, useFinwise } from "@/components/finwise-store"
import { useSession } from "next-auth/react"
import { formatIDRInput, parseIDRInput } from "@/lib/finwise"

export default function ProfilePageWrapper() {
  return (
    <FinwiseProvider>
      <ProfilePage />
    </FinwiseProvider>
  )
}

function ProfilePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const store = useFinwise()
  
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    birthDate: "",
    gender: "Laki-laki",
    occupation: "",
    savingsTarget: "20",
    currency: "IDR",
  })

  useEffect(() => {
    // Load from session
    if (session?.user) {
      setProfile(prev => ({
        ...prev,
        name: prev.name || session.user?.name || "",
        email: prev.email || session.user?.email || "",
      }))
    }
    
    // Load saved profile
    const saved = localStorage.getItem("finwise-profile-data")
    if (saved) {
      try {
        setProfile(prev => ({ ...prev, ...JSON.parse(saved) }))
      } catch {}
    }
  }, [session])

  function updateField(key: string, value: string) {
    setProfile(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      localStorage.setItem("finwise-profile-data", JSON.stringify(profile))
      // Update monthly income in store
      if (profile.savingsTarget) {
        store.updateMonthlyIncome(parseInt(profile.savingsTarget) || 0)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error("Failed to save:", err)
    }
    setSaving(false)
  }


  // Get real stats from store
  const txCount = store.transactions.length
  const activeMonths = new Set(store.transactions.map(tx => tx.date?.slice(0, 7))).size
  const totalBalance = store.getTotalBalance()

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition">
            <ArrowLeft className="size-5 text-gray-400" />
          </button>
          <h1 className="text-lg font-semibold text-white">Edit Profil</h1>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-semibold hover:from-teal-600 hover:to-cyan-600 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? "✓ Tersimpan" : "Simpan"}
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center py-6">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 flex items-center justify-center text-4xl overflow-hidden">
              {session?.user?.image ? (
                <img src={session.user.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">{(profile.name || 'U')[0].toUpperCase()}</span>
              )}
            </div>
            <button className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-background border-2 border-teal-500 flex items-center justify-center">
              <Camera className="size-4 text-teal-400" />
            </button>
          </div>
          <h2 className="text-xl font-semibold text-white">{profile.name || "User"}</h2>
          <p className="text-sm text-gray-400 mt-1">{profile.email || "email@contoh.com"}</p>
        </div>

        {/* Personal Info */}
        <section>
          <h3 className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-4 px-1">Informasi Pribadi</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Masukkan nama"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted border border-border text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="email@contoh.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted border border-border text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">No. HP</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="08xxx"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted border border-border text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tanggal Lahir</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                  <input
                    type="date"
                    value={profile.birthDate}
                    onChange={(e) => updateField("birthDate", e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted border border-border text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Jenis Kelamin</label>
              <select
                value={profile.gender}
                onChange={(e) => updateField("gender", e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition appearance-none cursor-pointer"
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>
        </section>

        {/* Financial Info */}
        <section>
          <h3 className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-4 px-1">Informasi Keuangan</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Pekerjaan</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                <input
                  type="text"
                  value={profile.occupation}
                  onChange={(e) => updateField("occupation", e.target.value)}
                  placeholder="Freelancer, Karyawan, dll"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted border border-border text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Penghasilan Bulanan</label>
              <div className="relative">
                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                <input
                  type="text"
                  value={store.monthlyIncome ? formatIDRInput(String(store.monthlyIncome)) : ""}
                  onChange={(e) => store.updateMonthlyIncome(parseIDRInput(e.target.value))}
                  placeholder="Rp 0"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted border border-border text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Target Tabungan (%)</label>
                <div className="relative">
                  <Target className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                  <input
                    type="number"
                    value={profile.savingsTarget}
                    onChange={(e) => updateField("savingsTarget", e.target.value)}
                    placeholder="20"
                    min="0"
                    max="100"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted border border-border text-white placeholder-gray-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Mata Uang</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                  <select
                    value={profile.currency}
                    onChange={(e) => updateField("currency", e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted border border-border text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition appearance-none cursor-pointer"
                  >
                    <option value="IDR">IDR (Rupiah)</option>
                    <option value="USD">USD (Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Card - Real Data */}
        <div className="rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20 p-5">
          <h3 className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-4">📊 Statistik Akun</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{txCount}</div>
              <div className="text-xs text-gray-400 mt-1">Transaksi</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{activeMonths}</div>
              <div className="text-xs text-gray-400 mt-1">Bulan Aktif</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(totalBalance)}
              </div>
              <div className="text-xs text-gray-400 mt-1">Total Saldo</div>
            </div>
          </div>
        </div>

        {/* Preferences - Connected to Store */}
        <section>
          <h3 className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-4 px-1">Preferensi</h3>
          
          <div className="space-y-3">
            <ToggleItem
              icon={<Bell className="size-5" />}
              title="Notifikasi Push"
              desc="Pengingat tagihan & budget"
              active={true}
              onChange={() => {}}
            />
            <ToggleItem
              icon={<Moon className="size-5" />}
              title="Mode Gelap"
              desc="Tampilan gelap untuk mata"
              active={store.theme === 'dark'}
              onChange={store.toggleTheme}
            />
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${store.pin ? 'bg-teal-500/20 text-teal-400' : 'bg-gray-500/20 text-gray-500'}`}>
                  <Lock className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Kunci PIN</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {store.pin ? '✅ PIN aktif' : '⚪ Tidak aktif'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (store.pin) {
                    // PIN aktif, tampilkan opsi
                    const action = confirm('PIN sudah aktif.\n\nOK = Ubah PIN\nCancel = Nonaktifkan PIN')
                    if (action) {
                      const newPin = prompt('Masukkan PIN baru (4-6 digit):')
                      if (newPin && /^\d{4,6}$/.test(newPin)) {
                        store.setPin(newPin)
                        alert('✅ PIN berhasil diubah!')
                      } else if (newPin !== null) {
                        alert('❌ PIN harus 4-6 digit angka')
                      }
                    } else if (action === false) {
                      if (confirm('Yakin nonaktifkan PIN?')) {
                        store.setPin(null)
                        alert('✅ PIN dinonaktifkan')
                      }
                    }
                  } else {
                    // PIN belum aktif, tampilkan set PIN
                    const newPin = prompt('Masukkan PIN baru (4-6 digit):')
                    if (newPin && /^\d{4,6}$/.test(newPin)) {
                      store.setPin(newPin)
                      alert('✅ PIN berhasil diaktifkan!')
                    } else if (newPin !== null) {
                      alert('❌ PIN harus 4-6 digit angka')
                    }
                  }
                }}
                className="px-4 py-2 rounded-lg bg-teal-500/20 text-teal-400 text-sm font-medium hover:bg-teal-500/30 transition"
              >
                {store.pin ? 'Ubah' : 'Aktifkan'}
              </button>
            </div>
            <ToggleItem
              icon={<BarChart3 className="size-5" />}
              title="Sembunyikan Saldo"
              desc="Sembunyikan angka di dashboard"
              active={store.hideBalance}
              onChange={store.toggleHideBalance}
            />
          </div>
        </section>

        {/* Danger Zone */}
        <section className="pt-8 border-t border-border">
          <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-4 px-1">⚠️ Zona Bahaya</h3>
          
          <div className="space-y-3">
            <button 
              onClick={() => {
                if (confirm("Yakin hapus semua transaksi? Ini tidak bisa dibatalkan.")) {
                  store.resetAll()
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
            >
              <Trash2 className="size-5" />
              <span className="text-sm font-medium">Reset Semua Data</span>
            </button>
          </div>
        </section>

        <div className="h-8"></div>
      </div>
    </div>
  )
}

function ToggleItem({ icon, title, desc, active, onChange }: {
  icon: React.ReactNode
  title: string
  desc: string
  active: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${active ? 'bg-teal-500/20 text-teal-400' : 'bg-gray-500/20 text-gray-500'}`}>
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium text-white">{title}</div>
          <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
        </div>
      </div>
      <button
        onClick={onChange}
        className={`relative w-12 h-7 rounded-full transition-colors ${active ? 'bg-teal-500' : 'bg-gray-600'}`}
      >
        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${active ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
}
