"use client"
import { useState, useRef, useEffect, useMemo } from "react"
import { signIn } from "next-auth/react"
import { Loader2, MessageCircle, CheckCircle, ArrowLeft, Send, HelpCircle, Eye, EyeOff, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import { isNativePlatform } from "@/lib/platform"

/* ═══════════════════════════════════════════
   WISE STYLE DESIGN SYSTEM
═══════════════════════════════════════════ */
const clayStyles = `
/* ─── Background ─── */
.clay-bg {
  background:
    radial-gradient(circle at 15% 25%, rgba(159,232,112,0.10) 0%, transparent 40%),
    radial-gradient(circle at 85% 75%, rgba(159,232,112,0.08) 0%, transparent 35%),
    radial-gradient(circle at 55% 85%, rgba(46,173,75,0.05) 0%, transparent 40%),
    radial-gradient(circle at 40% 10%, rgba(159,232,112,0.06) 0%, transparent 30%),
    repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(159,232,112,0.06) 59px, rgba(159,232,112,0.06) 60px),
    repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(159,232,112,0.06) 59px, rgba(159,232,112,0.06) 60px),
    radial-gradient(ellipse at 50% 40%, #f5f8ee 0%, #f0f5e8 70%);
  min-height: 100vh; position: relative; overflow: hidden;
}

/* ─── Card ─── */
.clay-card {
  position: relative; z-index: 10;
  width: 100%; max-width: 380px;
  background: linear-gradient(#FFFFFF, #FFFFFF) padding-box,
              linear-gradient(135deg, rgba(159,232,112,0.35), rgba(46,173,75,0.12), rgba(159,232,112,0.05)) border-box;
  border: 2px solid transparent;
  border-radius: 32px;
  padding: 40px 32px 36px;
  box-shadow: 0 25px 60px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.05), inset 0 2px 0 rgba(255,255,255,0.8);
  overflow: visible;
  animation: fadeInUp 0.5s ease forwards;
}
.clay-card::before {
  content: '';
  position: absolute;
  top: 0; left: 50%; transform: translateX(-50%);
  width: 40px; height: 4px;
  background: linear-gradient(90deg, #E8C878, #D4A843);
  border-radius: 0 0 4px 4px;
  z-index: 5;
}

/* ─── Mascot ─── */
.clay-mascot {
  position: absolute; top: -85px; left: 50%; transform: translateX(-50%);
  z-index: 20; width: 100px; height: 100px;
  animation: charBounce 3s ease-in-out infinite;
}
.clay-mascot::before {
  content: '';
  position: absolute;
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 130px; height: 130px;
  background: radial-gradient(circle, rgba(159,232,112,0.22) 0%, transparent 70%);
  border-radius: 50%;
  z-index: -1;
}
@keyframes charBounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-6px); }
}

/* ─── Header ─── */
.clay-header h1 {
  font-size: 26px; font-weight: 900;
  color: #0e0f0c;
  letter-spacing: -0.3px;
  text-align: center;
}
.clay-header h1::after {
  content: '';
  display: block;
  width: 30%; height: 3px;
  background: linear-gradient(90deg, #E8C878, #D4A843);
  margin: 8px auto 0;
  border-radius: 2px;
}
.clay-subtitle {
  font-size: 14px; color: #868685;
  margin-top: 2px; font-weight: 600;
}

/* ─── Recessed Input ─── */
.clay-input-group { position: relative; margin-bottom: 14px; }
.clay-input-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  width: 34px; height: 34px;
  background: #e2f6d5;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 3px 8px rgba(0,0,0,0.06);
  z-index: 2;
}
.clay-input-icon svg { width: 15px; height: 15px; fill: #D4A843; }
.clay-input-field {
  width: 100%; height: 52px;
  background: #e8ebe6;
  border: 2px solid transparent;
  border-radius: 16px;
  padding: 0 44px 0 54px;
  font-size: 14px; color: #0e0f0c;
  font-family: inherit; font-weight: 600;
  box-shadow: inset 0 3px 8px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04);
  transition: all 0.25s;
  outline: none;
}
.clay-input-field::placeholder { color: #868685; font-weight: 500; }
.clay-input-field:focus {
  border-color: #E8C878;
  background: #e2f6d5;
  box-shadow: inset 0 3px 8px rgba(0,0,0,0.04), 0 0 0 4px rgba(44,181,160,0.1);
}
.clay-pwd-toggle {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  width: 30px; height: 30px;
  background: #e2f6d5;
  border: none; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  transition: all 0.2s;
  z-index: 2;
  color: #D4A843;
}
.clay-pwd-toggle:hover { transform: translateY(-50%) scale(1.1); }

/* ─── Forgot ─── */
.clay-forgot-row { text-align: right; margin-bottom: 16px; margin-top: -6px; }
.clay-forgot-link {
  font-size: 12px; color: #D4A843;
  font-weight: 700; text-decoration: none;
  transition: opacity 0.2s;
}
.clay-forgot-link:hover { opacity: 0.7; }

/* ─── Button ─── */
.clay-btn {
  width: 100%; height: 52px;
  background: linear-gradient(135deg, #E8C878 0%, #D4A843 100%);
  color: white;
  border: none; border-radius: 16px;
  font-size: 16px; font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.2);
  transition: all 0.2s;
}
.clay-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(0,0,0,0.1); }
.clay-btn:active { transform: translateY(0); }
.clay-btn:disabled { opacity: 0.5; transform: none; }

/* ─── Divider ─── */
.clay-divider {
  display: flex; align-items: center;
  margin: 20px 0;
  color: #868685;
  font-size: 12px; font-weight: 600;
}
.clay-divider::before, .clay-divider::after {
  content: ''; flex: 1; height: 1.5px;
  background: linear-gradient(90deg, transparent, #E8C878, transparent);
}
.clay-divider::before { margin-right: 14px; }
.clay-divider::after { margin-left: 14px; }

/* ─── Social ─── */
.clay-social-btn {
  width: 100%; height: 50px;
  background: white;
  border: 2px solid #e8ebe6;
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  cursor: pointer;
  font-size: 14px; font-weight: 700; color: #0e0f0c; font-family: inherit;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transition: all 0.25s;
}
.clay-social-btn:hover { transform: translateY(-2px); border-color: #E8C878; box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
.clay-social-btn svg { width: 20px; height: 20px; }
.clay-social-google { border-left: 4px solid #4285F4; }
.clay-social-telegram { border-left: 4px solid #229ED9; }
.clay-social-email { border-left: 4px solid #D4A843; }

/* ─── Footer ─── */
.clay-footer { text-align: center; font-size: 13px; color: #868685; font-weight: 600; }
.clay-footer a { color: #D4A843; font-weight: 800; text-decoration: none; padding: 4px 10px; border-radius: 8px; background: rgba(159,232,112,0.12); transition: all 0.2s; }
.clay-footer a:hover { background: rgba(159,232,112,0.25); text-decoration: none; opacity: 1; }

/* ─── OTP Input ─── */
.clay-otp-input {
  flex: 1; rounded-xl;
  border-radius: 14px;
  border: 2px solid #e8ebe6;
  background: #e8ebe6;
  padding: 0.875rem 1rem;
  text-align: center; text-xl;
  font-size: 20px;
  letter-spacing: 0.5em;
  font-family: monospace;
  color: #0e0f0c;
  outline: none;
  transition: all 0.25s;
  box-shadow: inset 0 3px 8px rgba(0,0,0,0.06);
}
.clay-otp-input:focus {
  border-color: #E8C878;
  box-shadow: inset 0 3px 8px rgba(0,0,0,0.04), 0 0 0 4px rgba(44,181,160,0.1);
}

/* ─── Alt method link ─── */
.clay-alt-link {
  font-size: 12px; color: #868685;
  font-weight: 600; cursor: pointer;
  background: none; border: none;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  margin: 0 auto;
  transition: color 0.2s;
}
.clay-alt-link:hover { color: #0e0f0c; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 480px) {
  .clay-card { padding: 32px 24px 28px; border-radius: 24px; }
  .clay-mascot { top: -70px; width: 80px; height: 80px; }
  .clay-mascot::before { width: 110px; height: 110px; }
}

/* ─── Desktop Split Layout (≥768px) ─── */
.clay-brand-panel { display: none; }

@media (min-width: 768px) {
  .clay-bg {
    flex-direction: row !important;
    padding: 0 !important;
    align-items: stretch !important;
  }
  .clay-brand-panel {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 60px 48px;
    width: 44%;
    max-width: 560px;
    background: linear-gradient(135deg, #D4A843 0%, #E8C878 100%);
    position: relative;
    z-index: 5;
  }
  .clay-brand-panel::before {
    content: '';
    position: absolute;
    top: 10%; right: -30px;
    width: 120px; height: 120px;
    background: rgba(255,255,255,0.1);
    border-radius: 50%;
  }
  .clay-brand-panel::after {
    content: '';
    position: absolute;
    bottom: 15%; right: -10px;
    width: 80px; height: 80px;
    background: rgba(255,255,255,0.08);
    border-radius: 50%;
  }
  .clay-brand-mascot {
    position: relative;
    z-index: 2;
    margin-bottom: 8px;
  }
  .clay-brand-panel h2 {
    font-size: 30px;
    font-weight: 900;
    color: white;
    margin-top: 20px;
    margin-bottom: 12px;
    letter-spacing: -0.5px;
    line-height: 1.2;
    position: relative;
    z-index: 2;
  }
  .clay-brand-panel p {
    font-size: 15px;
    color: rgba(255,255,255,0.9);
    line-height: 1.6;
    position: relative;
    z-index: 2;
  }
  .clay-brand-features {
    margin-top: 28px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: relative;
    z-index: 2;
  }
  .clay-brand-feature {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    color: rgba(255,255,255,0.95);
    font-weight: 600;
  }
  .clay-brand-feature::before {
    content: '✓';
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px; height: 24px;
    background: rgba(255,255,255,0.2);
    border-radius: 50%;
    font-size: 12px;
    flex-shrink: 0;
  }
  .clay-brand-badge {
    margin-top: 32px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(255,255,255,0.15);
    border-radius: 100px;
    font-size: 13px;
    font-weight: 700;
    color: white;
    width: fit-content;
    position: relative;
    z-index: 2;
  }
  .clay-card-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
  }
  .clay-card {
    max-width: 420px;
  }
}
`

// ─── FinWise Cat Component ───
function FinWiseCat({ size = 100 }: { size?: number }) {
  return (
    <img
      src="/mascot-cat-512.png?v=4"
      alt="FinWise Cat"
      width={size} height={Math.round(size * 472 / 414)}
      style={{ objectFit: 'contain' }}
    />
  )
}

// ─── Step indicator ───
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i + 1 < current ? "w-4 bg-[#D4A843]" : i + 1 === current ? "w-6 bg-[#D4A843]" : "w-1.5 bg-[#e8ebe6]"
          }`}
        />
      ))}
    </div>
  )
}

// ─── View types ───
type View = "login" | "register" | "forgot" | "telegram" | "email-otp"

export default function LoginPage() {
  const router = useRouter()
  const isNative = useMemo(() => isNativePlatform(), [])

  // ─── Global state ───
  const [loading, setLoading] = useState<"google" | "telegram" | "email" | "credentials" | "register" | null>(null)
  const [error, setError] = useState("")

  // ─── View state ───
  const [view, setView] = useState<View>("login")

  // ─── Email + Password ───
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // ─── Registration (OTP + password) ───
  const [regPassword, setRegPassword] = useState("")
  const [regConfirm, setRegConfirm] = useState("")
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [regStep, setRegStep] = useState<"form" | "otp" | "done">("form")

  // ─── Telegram OTP ───
  const [tgStep, setTgStep] = useState<"idle" | "code" | "done">("idle")
  const [tgUsername, setTgUsername] = useState("")
  const [tgCode, setTgCode] = useState("")
  const [botUrl, setBotUrl] = useState("")
  const [channelUrl, setChannelUrl] = useState("")

  // ─── Email OTP ───
  const [emailStep, setEmailStep] = useState<"idle" | "sent" | "done">("idle")
  const [email, setEmail] = useState("")
  const [emailCode, setEmailCode] = useState("")

  // ─── Refs ───
  const otpRef = useRef<HTMLInputElement>(null)
  const emailOtpRef = useRef<HTMLInputElement>(null)
  const authEmailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (tgStep === "code") otpRef.current?.focus()
  }, [tgStep])
  useEffect(() => {
    if (emailStep === "sent") emailOtpRef.current?.focus()
  }, [emailStep])

  const isLoading = loading !== null

  // ═══════════════════════════════════════════
  //  HANDLERS
  // ═══════════════════════════════════════════

  async function handleEmailPasswordLogin() {
    if (!authEmail.trim()) return setError("Masukkan email kamu")
    if (!authPassword.trim()) return setError("Masukkan password")
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(authEmail.trim())) return setError("Format email tidak valid")
    if (authPassword.length < 6) return setError("Password minimal 6 karakter")
    setLoading("credentials"); setError("")

    try {
      const result = await signIn("email-password", { email: authEmail.trim().toLowerCase(), password: authPassword, redirect: false })
      if (result?.error) { setError("Email atau password salah"); setLoading(null) }
      else if (result?.ok) {
        router.push("/")
        router.refresh()
      }
    } catch { setError("Koneksi gagal. Periksa internet kamu."); setLoading(null) }
  }

  // Registration: validate form → create account → auto-login
  async function handleRegisterRequest() {
    if (!email.trim()) return setError("Masukkan email kamu")
    if (!regPassword.trim()) return setError("Masukkan password")
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) return setError("Format email tidak valid")
    if (regPassword.length < 8) return setError("Password minimal 8 karakter")
    if (regPassword !== regConfirm) return setError("Password tidak cocok")

    setLoading("register"); setError("")
    try {
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: regPassword, name: email.trim().split("@")[0] }),
      })
      const regData = await regRes.json()

      if (regRes.status === 409) {
        const loginResult = await signIn("email-password", { email: email.trim().toLowerCase(), password: regPassword, redirect: false })
        if (loginResult?.ok) { router.push("/"); router.refresh() }
        else setError("Email sudah terdaftar. Coba masuk dengan password.")
        setLoading(null)
        return
      }

      if (!regRes.ok) { setError(regData.error || "Gagal mendaftarkan akun. Coba lagi."); setLoading(null); return }

      const loginResult = await signIn("email-password", { email: email.trim().toLowerCase(), password: regPassword, redirect: false })
      if (loginResult?.ok) { router.push("/"); router.refresh() }
      else { setView("login"); setAuthEmail(email.trim().toLowerCase()); setError("Akun berhasil dibuat. Silakan masuk.") }
    } catch { setError("Koneksi gagal.") }
    setLoading(null)
  }

  async function handleRegisterVerify() {
    if (!emailCode.trim()) return setError("Masukkan kode verifikasi")
    if (emailCode.trim().length < 6) return setError("Kode harus 6 digit")
    setLoading("register"); setError("")
    try {
      // 1. Verify OTP
      const verifyRes = await fetch("/api/email-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", email: email.trim(), code: emailCode }) })
      const verifyData = await verifyRes.json()
      if (verifyRes.status === 429) { setError(verifyData.error || "Terlalu banyak percobaan"); setLoading(null); return }
      if (!verifyData.ok) { setError(verifyData.error || "Kode salah"); setLoading(null); return }

      // 2. Create account with password
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: regPassword, name: email.trim().split("@")[0] }),
      })
      const regData = await regRes.json()
      if (regRes.status === 409) {
        // Email already exists → just login with password
        const loginResult = await signIn("email-password", { email: email.trim().toLowerCase(), password: regPassword, redirect: false })
        if (loginResult?.ok) { router.push("/"); router.refresh() }
        else { setError("Email sudah terdaftar. Coba masuk dengan password."); setRegStep("form"); setLoading(null) }
        return
      }
      if (!regRes.ok) { setError(regData.error || "Gagal mendaftar"); setLoading(null); return }

      // 3. Auto-login (default plan: Basic)
      setRegStep("done")
      const loginResult = await signIn("email-password", { email: email.trim().toLowerCase(), password: regPassword, redirect: false })
      if (loginResult?.ok) { router.push("/"); router.refresh() }
      else { setView("login"); setAuthEmail(email.trim().toLowerCase()); setLoading(null) }
    } catch { setError("Koneksi gagal."); setLoading(null) }
  }

  async function handleGoogleLogin() {
    setLoading("google"); setError("")
    try { await signIn("google", { callbackUrl: "/" }) }
    catch { setError("Gagal login dengan Google"); setLoading(null) }
  }

  async function handleTelegramRequest() {
    if (!tgUsername.trim()) return setError("Masukkan username Telegram")
    if (!/^[a-zA-Z0-9_]+$/.test(tgUsername.trim())) return setError("Username hanya huruf, angka, dan underscore")
    setLoading("telegram"); setError(""); setBotUrl(""); setChannelUrl("")
    try {
      const res = await fetch("/api/telegram-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "request", username: tgUsername.trim() }) })
      const data = await res.json()
      if (res.status === 429) { setError(data.error || "Terlalu banyak percobaan"); setLoading(null); return }
      if (data.needStart) { setBotUrl(data.botUrl); setLoading(null); return }
      if (data.needJoin) { setChannelUrl(data.channelUrl); setLoading(null); return }
      if (data.ok) setTgStep("code")
      else setError(data.error || "Gagal mengirim kode")
    } catch { setError("Koneksi gagal. Periksa internet kamu.") }
    setLoading(null)
  }

  async function handleTelegramVerify() {
    if (!tgCode.trim()) return setError("Masukkan kode verifikasi")
    if (tgCode.trim().length < 6) return setError("Kode harus 6 digit")
    setLoading("telegram"); setError("")
    try {
      const res = await fetch("/api/telegram-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", username: tgUsername.trim(), code: tgCode }) })
      const data = await res.json()
      if (res.status === 429) { setError(data.error || "Terlalu banyak percobaan"); setLoading(null); return }
      if (data.ok && data.user?.sig) {
        setTgStep("done")
        try {
          const authRes = await fetch("/api/auth-telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: data.user.id, name: data.user.name, username: data.user.username, sig: data.user.sig }) })
          if (authRes.ok) window.location.href = "/"
          else { const errData = await authRes.json().catch(() => null); setError(errData?.error || "Login gagal"); setTgStep("code"); setLoading(null) }
        } catch { setError("Koneksi ke server gagal."); setTgStep("code"); setLoading(null) }
      } else { setError(data.error || "Kode salah"); setLoading(null) }
    } catch { setError("Koneksi gagal."); setLoading(null) }
  }

  async function handleEmailRequest() {
    if (!email.trim()) return setError("Masukkan alamat email")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Format email tidak valid")
    setLoading("email"); setError("")
    try {
      const res = await fetch("/api/email-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "request", email: email.trim() }) })
      const data = await res.json()
      if (res.status === 429) { setError(data.error || "Terlalu banyak percobaan"); setLoading(null); return }
      if (data.ok) setEmailStep("sent")
      else setError(data.error || "Gagal mengirim kode")
    } catch { setError("Koneksi gagal.") }
    setLoading(null)
  }

  async function handleEmailVerify() {
    if (!emailCode.trim()) return setError("Masukkan kode verifikasi")
    if (emailCode.trim().length < 6) return setError("Kode harus 6 digit")
    setLoading("email"); setError("")
    try {
      const res = await fetch("/api/email-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", email: email.trim(), code: emailCode }) })
      const data = await res.json()
      if (res.status === 429) { setError(data.error || "Terlalu banyak percobaan"); setLoading(null); return }
      if (data.ok) { setEmailStep("done"); window.location.href = "/" }
      else { setError(data.error || "Kode salah"); setLoading(null) }
    } catch { setError("Koneksi gagal."); setLoading(null) }
  }

  function resetTelegram() { setTgStep("idle"); setTgCode(""); setError(""); setBotUrl(""); setChannelUrl("") }
  function resetEmail() { setEmailStep("idle"); setEmailCode(""); setError("") }
  function goBack() { setView("login"); setError(""); resetTelegram(); resetEmail(); setRegStep("form"); setRegPassword(""); setRegConfirm("") }

  // ═══════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════
  return (
    <>
      <style>{clayStyles}</style>
      <div className="clay-bg flex flex-col items-center justify-center p-6">

        {/* ═══ BRAND PANEL (desktop only) ═══ */}
        <div className="clay-brand-panel">
          <div className="clay-brand-mascot">
            <FinWiseCat size={120} />
          </div>
          <h2>Catat Keuangan Lebih Pintar ✨</h2>
          <p>AI financial assistant untuk generasi muda Indonesia. Catat, analisis, dan capai target keuanganmu — semua dalam satu app.</p>
          <div className="clay-brand-features">
            <div className="clay-brand-feature">Scan struk dengan AI</div>
            <div className="clay-brand-feature">Laporan visual interaktif</div>
            <div className="clay-brand-feature">Multi dompet & rekening</div>
            <div className="clay-brand-feature">Data terenkripsi end-to-end</div>
          </div>
          <div className="clay-brand-badge">⭐ 4.9/5 rating dari pengguna</div>
        </div>

        {/* ═══ CARD WRAPPER ═══ */}
        <div className="clay-card-wrapper">
        <div className="clay-card">
          {/* ─── Mascot ─── */}
          <div className="clay-mascot">
            <FinWiseCat />
          </div>

          {/* ─── Header ─── */}
          <div className="text-center mb-6 mt-[30px]">
            <div className="clay-header">
              <h1>
                {view === "register" ? "Buat Akun" : view === "forgot" ? "Reset Password" : "Selamat Datang"}
              </h1>
              <p className="clay-subtitle">
                {view === "register"
                  ? "Mulai perjalananmu."
                  : view === "forgot"
                    ? "Kami bantu reset password."
                    : "Masuk ke akunmu"}
              </p>
            </div>
          </div>

          {/* ─── Error ─── */}
          {error && (
            <div role="alert" className="rounded-xl border border-red-300/50 bg-red-50 px-4 py-3 text-center text-sm text-red-600 mb-4 animate-[slideUp_0.2s_ease]">
              {error}
            </div>
          )}

          {/* ═══════════════════════════════════════
              LOGIN VIEW (utama)
          ═══════════════════════════════════════ */}
          {view === "login" && (
            <div className="space-y-0">
              {/* Email */}
              <div className="clay-input-group">
                <div className="clay-input-icon">
                  <svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z" /></svg>
                </div>
                <input ref={authEmailRef} type="email" className="clay-input-field" placeholder="Email"
                  value={authEmail} onChange={(e) => { setAuthEmail(e.target.value); setError("") }}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailPasswordLogin()} disabled={isLoading}
                />
              </div>
              {/* Password */}
              <div className="clay-input-group">
                <div className="clay-input-icon">
                  <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.8-2.2-5-5-5S7 3.2 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.7 1.3-3 3.1-3s3.1 1.3 3.1 3v2z" /></svg>
                </div>
                <input type={showPassword ? "text" : "password"} className="clay-input-field" placeholder="Password"
                  value={authPassword} onChange={(e) => { setAuthPassword(e.target.value); setError("") }}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailPasswordLogin()} disabled={isLoading}
                />
                <button type="button" className="clay-pwd-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {/* Lupa password */}
              <div className="clay-forgot-row">
                <button onClick={() => { setView("forgot"); setError("") }} className="clay-forgot-link">Lupa Password?</button>
              </div>

              {/* Tombol Masuk */}
              <button className="clay-btn" onClick={handleEmailPasswordLogin} disabled={isLoading}>
                {loading === "credentials" ? <Loader2 className="size-5 animate-spin mx-auto" /> : "Masuk"}
              </button>

              {/* Pembatas */}
              <div className="clay-divider">atau masuk dengan</div>

              {/* Google — hidden in native APK because OAuth opens external browser */}
              {isNative ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs text-amber-700 mb-3">
                  <strong>📱 Mode APK:</strong> Login Google tidak tersedia.
                  <br />Gunakan <b>Email + Password</b>, <b>Telegram OTP</b>, atau <b>Email OTP</b>.
                </div>
              ) : (
              <button className="clay-social-btn clay-social-google mb-3" onClick={handleGoogleLogin} disabled={isLoading}>
                {loading === "google" ? <Loader2 className="size-5 animate-spin text-gray-400" /> : (
                  <svg viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                <span>Google</span>
              </button>
              )}

              {/* Telegram & Email OTP */}
              <div className="flex flex-col gap-2 mb-4">
                <button className="clay-social-btn clay-social-telegram" style={{ height: 42, fontSize: 13 }}
                  onClick={() => { setView("telegram"); setError("") }} disabled={isLoading}>
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
                    <path fill="#229ED9" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.97 1.25-5.56 3.67-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 3.99-1.74 6.65-2.89 7.98-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.54.17.14.12.18.28.2.47-.01.06.01.24 0 .36z" />
                  </svg>
                  <span>Telegram</span>
                </button>
                <button className="clay-social-btn clay-social-email" style={{ height: 42, fontSize: 13 }}
                  onClick={() => { setView("email-otp"); setError("") }} disabled={isLoading}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <span>Email OTP</span>
                </button>
              </div>

              {/* Daftar + Security */}
              <div className="clay-footer mt-1">
                <p className="text-xs text-[#868685] mb-2 opacity-50">🛡️ Data terlindungi</p>
                Belum punya akun? <button onClick={() => { setView("register"); setError("") }} className="font-800 underline underline-offset-2">Daftar</button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════
              REGISTER VIEW (Email + Password + OTP + Invite)
          ═══════════════════════════════════════ */}
                  {view === "register" && regStep === "form" && (
                    <div className="space-y-0">
                      <p className="text-sm text-center text-[#868685] mb-3">Daftar dengan email & password ✉️</p>
                      <div className="clay-input-group">
                        <div className="clay-input-icon">
                          <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
                        </div>
                        <input type="email" className="clay-input-field" placeholder="Email"
                          value={email} onChange={(e) => { setEmail(e.target.value); setError("") }}
                          onKeyDown={(e) => e.key === "Enter" && handleRegisterRequest()} disabled={isLoading} autoFocus
                        />
                      </div>
                      <div className="clay-input-group">
                        <div className="clay-input-icon">
                          <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.8-2.2-5-5-5S7 3.2 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.7 1.3-3 3.1-3s3.1 1.3 3.1 3v2z" /></svg>
                        </div>
                        <input type={showRegPassword ? "text" : "password"} className="clay-input-field" placeholder="Password (min 6 karakter)"
                          value={regPassword} onChange={(e) => { setRegPassword(e.target.value); setError("") }} disabled={isLoading}
                        />
                        <button type="button" className="clay-pwd-toggle" onClick={() => setShowRegPassword(!showRegPassword)}>
                          {showRegPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      <div className="clay-input-group">
                        <div className="clay-input-icon">
                          <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.8-2.2-5-5-5S7 3.2 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.7 1.3-3 3.1-3s3.1 1.3 3.1 3v2z" /></svg>
                        </div>
                        <input type={showRegPassword ? "text" : "password"} className="clay-input-field" placeholder="Konfirmasi password"
                          value={regConfirm} onChange={(e) => { setRegConfirm(e.target.value); setError("") }}
                          onKeyDown={(e) => e.key === "Enter" && handleRegisterRequest()} disabled={isLoading}
                        />
                      </div>

                      <button className="clay-btn mt-2" onClick={handleRegisterRequest} disabled={isLoading}>
                        {loading === "email" ? <Loader2 className="size-5 animate-spin mx-auto" /> : "Daftar 🚀"}
                      </button>
                      <div className="text-center mt-4">
                        <button onClick={() => { setView("login"); setError(""); setRegStep("form"); setRegPassword(""); setRegConfirm("") }}
                          className="text-xs text-[#868685] hover:text-[#0e0f0c] transition flex items-center justify-center gap-1 mx-auto font-600">
                          <ArrowLeft className="size-3" /> Sudah punya akun? Masuk
                        </button>
                      </div>
                    </div>
                  )}

          {view === "register" && regStep === "otp" && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-sm text-[#868685]">Verifikasi email kamu ✨</p>
                <p className="text-xs text-[#868685] font-medium">Kode dikirim ke {email}</p>
              </div>
              <div className="flex gap-2">
                <input ref={emailOtpRef} type="text" placeholder="• • • • • •" maxLength={6} inputMode="numeric"
                  value={emailCode} onChange={(e) => { setEmailCode(e.target.value.replace(/\D/g, "")); setError("") }}
                  onKeyDown={(e) => e.key === "Enter" && handleRegisterVerify()}
                  className="flex-1 rounded-xl border border-[#E8C878]/50 bg-[#e8ebe6] px-4 py-3.5 text-center text-xl tracking-[0.5em] font-mono outline-none transition-all focus:border-[#D4A843] focus:ring-2 focus:ring-[#D4A843]/20" />
                <button onClick={handleRegisterVerify} disabled={isLoading || emailCode.length < 6}
                  className="flex items-center justify-center rounded-xl bg-[#D4A843] px-4 py-3.5 text-white transition-all hover:bg-[#D4A843] disabled:opacity-50">
                  {loading === "register" ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle className="size-5" />}
                </button>
              </div>
              <button onClick={() => { setRegStep("form"); setEmailCode(""); setError("") }}
                className="flex w-full items-center justify-center gap-1.5 text-xs text-[#868685] hover:text-[#0e0f0c] transition py-1">
                <ArrowLeft className="size-3" /> Ubah data
              </button>
            </div>
          )}

          {view === "register" && regStep === "done" && (
            <div className="text-center space-y-3 py-6 animate-[slideUp_0.3s_ease]">
              <CheckCircle className="size-14 mx-auto text-[#D4A843]" />
              <p className="text-sm font-bold text-[#D4A843]">Akun berhasil dibuat! 🎉</p>
              <p className="text-xs text-[#868685]">Mengalihkan ke dashboard...</p>
            </div>
          )}

          {/* ═══════════════════════════════════════
              FORGOT VIEW
          ═══════════════════════════════════════ */}
          {view === "forgot" && (
            <div className="text-center space-y-4 py-4">
              <div className="rounded-xl border border-[#E8C878]/30 bg-[#e2f6d5] p-4">
                <p className="text-sm text-[#868685]">Reset password segera hadir! 🛠️</p>
                <p className="text-xs text-[#868685] mt-2">
                  Sementara, hubungi admin via <a href="https://t.me/ainsyir" target="_blank" rel="noopener noreferrer" className="text-[#D4A843] font-bold hover:underline">@ainsyir</a>
                </p>
              </div>
              <button onClick={goBack}
                className="clay-alt-link">
                <ArrowLeft className="size-3" /> Kembali ke Masuk
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════
              TELEGRAM OTP VIEW
          ═══════════════════════════════════════ */}
          {view === "telegram" && tgStep === "idle" && (
            <div className="space-y-4">
              <StepDots current={1} total={3} />
              <p className="text-sm text-center text-[#868685]">Masukkan username Telegram kamu 📱</p>
              <div className="flex gap-2">
                <input type="text" placeholder="Username (tanpa @)"
                  value={tgUsername} onChange={(e) => { setTgUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '')); setError("") }}
                  onKeyDown={(e) => e.key === "Enter" && handleTelegramRequest()} maxLength={50}
                  className="flex-1 rounded-xl border-2 border-[#e8ebe6] bg-[#e8ebe6] px-4 py-3 text-sm outline-none transition-all focus:border-[#E8C878] focus:ring-2 focus:ring-[#D4A843]/20"
                  style={{ fontFamily: "inherit", color: "#0e0f0c", fontWeight: 600, boxShadow: "inset 0 3px 8px rgba(0,0,0,0.06)" }}
                />
                <button onClick={handleTelegramRequest} disabled={isLoading}
                  className="flex items-center justify-center rounded-xl bg-[#229ED9] px-4 py-3 text-white transition-all hover:bg-[#229ED9] disabled:opacity-50">
                  {loading === "telegram" ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-4" />}
                </button>
              </div>
              {botUrl && (
                <div className="rounded-xl border border-[#D4A843]/30 bg-[#e2f6d5] p-4">
                  <p className="text-sm font-medium text-[#0e0f0c]">🤖 Bot belum aktif!</p>
                  <p className="text-xs text-[#868685] mt-1">Mulai chat dengan bot FinWise dulu ya.</p>
                  <a href={botUrl} target="_blank" rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#229ED9] px-4 py-2.5 text-sm font-medium text-white mt-2 transition hover:bg-[#229ED9]">
                    <MessageCircle className="size-4" /> Buka Bot
                  </a>
                </div>
              )}
              {channelUrl && (
                <div className="rounded-xl border border-[#D4A843]/30 bg-[#e2f6d5] p-4">
                  <p className="text-sm font-medium text-[#0e0f0c]">📢 Gabung channel dulu!</p>
                  <a href={channelUrl} target="_blank" rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#229ED9] px-4 py-2.5 text-sm font-medium text-white mt-2 transition hover:bg-[#229ED9]">
                    <MessageCircle className="size-4" /> Gabung Channel
                  </a>
                </div>
              )}
              <button onClick={goBack} className="clay-alt-link">
                <ArrowLeft className="size-3" /> Kembali ke Masuk
              </button>
            </div>
          )}

          {view === "telegram" && tgStep === "code" && (
            <div className="space-y-4">
              <StepDots current={2} total={3} />
              <div className="text-center space-y-1">
                <p className="text-sm text-[#868685]">Kode 6 digit dikirim via Telegram ✨</p>
                <p className="text-xs text-[#868685]">@{tgUsername}</p>
              </div>
              <div className="flex gap-2">
                <input ref={otpRef} type="text" placeholder="• • • • • •" maxLength={6} inputMode="numeric"
                  value={tgCode} onChange={(e) => { setTgCode(e.target.value.replace(/\D/g, "")); setError("") }}
                  onKeyDown={(e) => e.key === "Enter" && handleTelegramVerify()}
                  className="clay-otp-input flex-1" />
                <button onClick={handleTelegramVerify} disabled={isLoading || tgCode.length < 6}
                  className="flex items-center justify-center rounded-xl bg-[#D4A843] px-4 py-3.5 text-white transition-all hover:bg-[#D4A843] disabled:opacity-50">
                  {loading === "telegram" ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle className="size-5" />}
                </button>
              </div>
              <button onClick={resetTelegram} className="clay-alt-link">
                <ArrowLeft className="size-3" /> Ganti username
              </button>
            </div>
          )}

          {view === "telegram" && tgStep === "done" && (
            <div className="text-center space-y-3 py-6">
              <StepDots current={3} total={3} />
              <CheckCircle className="size-12 mx-auto text-[#D4A843]" />
              <p className="text-sm font-medium text-[#D4A843]">Terverifikasi! Mengalihkan...</p>
            </div>
          )}

          {/* ═══════════════════════════════════════
              EMAIL OTP VIEW
          ═══════════════════════════════════════ */}
          {view === "email-otp" && emailStep === "idle" && (
            <div className="space-y-4">
              <StepDots current={1} total={2} />
              <p className="text-sm text-center text-[#868685]">Masukkan alamat email ✉️</p>
              <div className="flex gap-2">
                <input type="email" placeholder="email@contoh.com"
                  value={email} onChange={(e) => { setEmail(e.target.value); setError("") }}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailRequest()}
                  className="flex-1 rounded-xl border-2 border-[#e8ebe6] bg-[#e8ebe6] px-4 py-3 text-sm outline-none transition-all focus:border-[#E8C878] focus:ring-2 focus:ring-[#D4A843]/20"
                  style={{ fontFamily: "inherit", color: "#0e0f0c", fontWeight: 600, boxShadow: "inset 0 3px 8px rgba(0,0,0,0.06)" }}
                />
                <button onClick={handleEmailRequest} disabled={isLoading}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[#D4A843] px-3 py-3 text-sm font-semibold text-white transition-all hover:bg-[#D4A843] disabled:opacity-50">
                  {loading === "email" ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-4 shrink-0" />}
                </button>
              </div>
              <button onClick={goBack} className="clay-alt-link">
                <ArrowLeft className="size-3" /> Kembali ke Masuk
              </button>
            </div>
          )}

          {view === "email-otp" && emailStep === "sent" && (
            <div className="space-y-4">
              <StepDots current={2} total={2} />
              <p className="text-sm text-center text-[#868685]">Kode dikirim ke email ✨</p>
              <p className="text-xs text-center text-[#868685] font-medium">{email}</p>
              <div className="flex gap-2">
                <input ref={emailOtpRef} type="text" placeholder="• • • • • •" maxLength={6} inputMode="numeric"
                  value={emailCode} onChange={(e) => { setEmailCode(e.target.value.replace(/\D/g, "")); setError("") }}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailVerify()}
                  className="clay-otp-input flex-1" />
                <button onClick={handleEmailVerify} disabled={isLoading || emailCode.length < 6}
                  className="flex items-center justify-center rounded-xl bg-[#D4A843] px-4 py-3.5 text-white transition-all hover:bg-[#D4A843] disabled:opacity-50">
                  {loading === "email" ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle className="size-5" />}
                </button>
              </div>
              <button onClick={resetEmail} className="clay-alt-link">
                <ArrowLeft className="size-3" /> Ganti email
              </button>
            </div>
          )}

          {view === "email-otp" && emailStep === "done" && (
            <div className="text-center space-y-3 py-6">
              <StepDots current={2} total={2} />
              <CheckCircle className="size-12 mx-auto text-[#D4A843]" />
              <p className="text-sm font-medium text-[#D4A843]">Login berhasil! Mengalihkan...</p>
            </div>
          )}

          {/* ─── Footer ─── */}
          <div className="text-center mt-5 pt-4 border-t border-[#E8C878]/30">
            <p className="flex items-center justify-center gap-1.5 text-xs text-[#868685]">
              🔒 Terenkripsi & aman
              <span className="mx-1">·</span>
              <a href="https://t.me/ainsyir" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#D4A843] font-bold hover:underline">
                <HelpCircle className="size-3" /> Butuh bantuan?
              </a>
            </p>
          </div>
        </div>
        </div>
      </div>
    </>
  )
}
