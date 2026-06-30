"use client"
import { useState, useRef, useEffect } from "react"
import { signIn } from "next-auth/react"
import { Loader2, MessageCircle, CheckCircle, ArrowLeft, Send, HelpCircle, Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"

/* ═══════════════════════════════════════════
   CLAYMORPHISM STYLES
═══════════════════════════════════════════ */
const clayStyles = `
/* ─── Background ─── */
.clay-bg { background: #d5f5f0; min-height: 100vh; position: relative; overflow: hidden; }

/* ─── Clouds ─── */
.clay-cloud {
  position: absolute;
  background: rgba(255,255,255,0.45);
  border-radius: 50%;
  pointer-events: none;
}
.clay-cloud-1 {
  width: 120px; height: 50px;
  top: 12%; left: 5%;
  border-radius: 50px;
  animation: cloudFloat 8s ease-in-out infinite alternate;
}
.clay-cloud-1::before {
  content: '';
  position: absolute;
  width: 50px; height: 40px;
  background: rgba(255,255,255,0.45);
  border-radius: 50%;
  top: -20px; left: 25px;
}
.clay-cloud-1::after {
  content: '';
  position: absolute;
  width: 35px; height: 30px;
  background: rgba(255,255,255,0.45);
  border-radius: 50%;
  top: -12px; left: 60px;
}
.clay-cloud-2 {
  width: 100px; height: 40px;
  top: 16%; right: 8%;
  border-radius: 40px;
  animation: cloudFloat 6s ease-in-out infinite alternate-reverse;
}
.clay-cloud-2::before {
  content: '';
  position: absolute;
  width: 40px; height: 32px;
  background: rgba(255,255,255,0.45);
  border-radius: 50%;
  top: -16px; left: 20px;
}
@keyframes cloudFloat {
  0% { transform: translateX(0); }
  100% { transform: translateX(25px); }
}

/* ─── Plant left ─── */
.clay-plant-left { position: absolute; bottom: 0; left: 3%; z-index: 2; width: 70px; }
.clay-pot {
  width: 70px; height: 50px;
  background: linear-gradient(135deg, #c4956a, #a87d5a);
  border-radius: 8px 8px 20px 20px;
  position: relative;
  box-shadow: inset 0 -8px 15px rgba(0,0,0,0.15), 0 5px 15px rgba(0,0,0,0.1);
}
.clay-pot::before {
  content: '';
  position: absolute; top: -8px; left: -5px; right: -5px; height: 16px;
  background: linear-gradient(135deg, #d4a574, #b8885e);
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
.clay-leaves { position: absolute; bottom: 45px; left: 50%; transform: translateX(-50%); }
.clay-leaf {
  position: absolute;
  width: 30px; height: 55px;
  background: #6ab04c;
  border-radius: 50% 50% 50% 50% / 70% 70% 30% 30%;
  box-shadow: inset 0 -5px 10px rgba(0,0,0,0.1);
  transform-origin: bottom center;
}
.clay-leaf-1 { transform: rotate(-30deg); left: -20px; }
.clay-leaf-2 { transform: rotate(0deg); left: 0; }
.clay-leaf-3 { transform: rotate(30deg); left: 20px; }

/* ─── Flower right ─── */
.clay-flower-right { position: absolute; bottom: 0; right: 3%; z-index: 2; }
.clay-fpot {
  width: 60px; height: 45px;
  background: linear-gradient(135deg, #f8b4c8, #e897af);
  border-radius: 8px 8px 18px 18px;
  position: relative;
  box-shadow: inset 0 -8px 12px rgba(0,0,0,0.1), 0 5px 12px rgba(0,0,0,0.1);
}
.clay-fpot::before {
  content: ''; position: absolute; top: -7px; left: -4px; right: -4px; height: 14px;
  background: linear-gradient(135deg, #f0a3b8, #e08da5);
  border-radius: 8px;
}
.clay-fstem {
  position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
  width: 4px; height: 50px; background: #6ab04c; border-radius: 2px;
}

/* ─── Card ─── */
.clay-card {
  position: relative; z-index: 10;
  width: 100%; max-width: 380px;
  background: #f0faf8;
  border-radius: 45px;
  padding: 40px 32px 32px;
  box-shadow: 0 25px 60px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.05), inset 0 2px 0 rgba(255,255,255,0.8);
  overflow: visible;
}

/* ─── Mascot ─── */
.clay-mascot {
  position: absolute; top: -85px; left: 50%; transform: translateX(-50%);
  z-index: 20; width: 130px; height: 130px;
  animation: charBounce 3s ease-in-out infinite;
}
@keyframes charBounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-6px); }
}

/* ─── Header ─── */
.clay-heart { font-size: 18px; display: block; margin-bottom: 4px; }
.clay-header h1 {
  font-size: 22px; font-weight: 900;
  color: #1a3d36;
  letter-spacing: -0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
}
.clay-sparkle {
  font-size: 11px;
  color: #ffc857;
  animation: sparkleAnim 2s ease-in-out infinite;
}
.clay-sparkle:nth-child(2) { animation-delay: 0.3s; }
.clay-sparkle:nth-child(3) { animation-delay: 0.6s; }
@keyframes sparkleAnim {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.7); }
}
.clay-subtitle {
  font-size: 13px; color: #6b9a91;
  margin-top: 2px; font-weight: 600;
}

/* ─── Recessed Input ─── */
.clay-input-group { position: relative; margin-bottom: 14px; }
.clay-input-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  width: 34px; height: 34px;
  background: #d5efe9;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 3px 8px rgba(0,0,0,0.06);
  z-index: 2;
}
.clay-input-icon svg { width: 15px; height: 15px; fill: #1a8f7d; }
.clay-input-field {
  width: 100%; height: 52px;
  background: #e2f3ef;
  border: 2px solid transparent;
  border-radius: 16px;
  padding: 0 44px 0 54px;
  font-size: 14px; color: #1a3d36;
  font-family: inherit; font-weight: 600;
  box-shadow: inset 0 3px 8px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04);
  transition: all 0.25s;
  outline: none;
}
.clay-input-field::placeholder { color: #82b0a6; font-weight: 500; }
.clay-input-field:focus {
  border-color: #8eddd0;
  background: #e8f7f3;
  box-shadow: inset 0 3px 8px rgba(0,0,0,0.04), 0 0 0 4px rgba(44,181,160,0.1);
}
.clay-pwd-toggle {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  width: 30px; height: 30px;
  background: #d5efe9;
  border: none; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  transition: all 0.2s;
  z-index: 2;
  color: #1a8f7d;
}
.clay-pwd-toggle:hover { transform: translateY(-50%) scale(1.1); }

/* ─── Forgot ─── */
.clay-forgot-row { text-align: right; margin-bottom: 16px; margin-top: -6px; }
.clay-forgot-link {
  font-size: 12px; color: #2cb5a0;
  font-weight: 700; text-decoration: none;
  transition: opacity 0.2s;
}
.clay-forgot-link:hover { opacity: 0.7; }

/* ─── Button ─── */
.clay-btn {
  width: 100%; height: 52px;
  background: linear-gradient(135deg, #8eddd0 0%, #2cb5a0 100%);
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
  color: #82b0a6;
  font-size: 12px; font-weight: 600;
}
.clay-divider::before, .clay-divider::after {
  content: ''; flex: 1; height: 1.5px;
  background: linear-gradient(90deg, transparent, #8eddd0, transparent);
}
.clay-divider::before { margin-right: 14px; }
.clay-divider::after { margin-left: 14px; }

/* ─── Social ─── */
.clay-social-btn {
  width: 100%; height: 48px;
  background: white;
  border: 2px solid #e2f3ef;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  cursor: pointer;
  font-size: 14px; font-weight: 700; color: #1a3d36; font-family: inherit;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transition: all 0.25s;
}
.clay-social-btn:hover { transform: translateY(-2px); border-color: #8eddd0; box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
.clay-social-btn svg { width: 20px; height: 20px; }

/* ─── Footer ─── */
.clay-footer { text-align: center; font-size: 13px; color: #6b9a91; font-weight: 600; }
.clay-footer a { color: #2cb5a0; font-weight: 800; text-decoration: none; }
.clay-footer a:hover { opacity: 0.7; text-decoration: underline; }

/* ─── OTP Input ─── */
.clay-otp-input {
  flex: 1; rounded-xl;
  border-radius: 14px;
  border: 2px solid #e2f3ef;
  background: #e2f3ef;
  padding: 0.875rem 1rem;
  text-align: center; text-xl;
  font-size: 20px;
  letter-spacing: 0.5em;
  font-family: monospace;
  color: #1a3d36;
  outline: none;
  transition: all 0.25s;
  box-shadow: inset 0 3px 8px rgba(0,0,0,0.06);
}
.clay-otp-input:focus {
  border-color: #8eddd0;
  box-shadow: inset 0 3px 8px rgba(0,0,0,0.04), 0 0 0 4px rgba(44,181,160,0.1);
}

/* ─── Alt method link ─── */
.clay-alt-link {
  font-size: 12px; color: #6b9a91;
  font-weight: 600; cursor: pointer;
  background: none; border: none;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  margin: 0 auto;
  transition: color 0.2s;
}
.clay-alt-link:hover { color: #1a3d36; }

@media (max-width: 480px) {
  .clay-card { padding: 32px 24px 28px; border-radius: 36px; }
  .clay-mascot { top: -70px; width: 110px; height: 110px; }
  .clay-plant-left, .clay-flower-right { display: none; }
}
`

// ─── FinWise Cat SVG Component ───
function FinWiseCat({ theme = "teal" }: { theme?: string }) {
  const bodyColor = "#E8F4F0"
  const hoodieColor = "#A8DDD0"
  const hoodieShadow = "#8EDDD0"
  const skinColor = "#F0FAF8"
  const earInner = "#E0F5F0"
  const eyeColor = "#1a3d36"
  const cheekColor = "#FFB8C8"

  return (
    <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" width="130" height="130">
      <ellipse cx="80" cy="105" rx="42" ry="35" fill={bodyColor}/>
      <path d="M45 90C45 72 60 58 80 58C100 58 115 72 115 90V105C115 120 100 130 80 130C60 130 45 120 45 105V90Z" fill={hoodieColor}/>
      <path d="M55 95C55 82 66 72 80 72C94 72 105 82 105 95V105C105 115 94 122 80 122C66 122 55 115 55 105V95Z" fill={hoodieShadow}/>
      <circle cx="80" cy="65" r="30" fill={skinColor}/>
      <path d="M55 42L45 12L72 35" fill={hoodieColor}/>
      <path d="M105 42L115 12L88 35" fill={hoodieColor}/>
      <path d="M58 40L50 18L70 36" fill={earInner}/>
      <path d="M102 40L110 18L90 36" fill={earInner}/>
      <ellipse cx="68" cy="60" rx="6" ry="7" fill={eyeColor}/>
      <ellipse cx="92" cy="60" rx="6" ry="7" fill={eyeColor}/>
      <circle cx="66" cy="57" r="2.5" fill="white"/>
      <circle cx="90" cy="57" r="2.5" fill="white"/>
      <path d="M86 63 Q92 59 98 63" stroke={eyeColor} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <ellipse cx="80" cy="68" rx="3" ry="2" fill="#E8A0B0"/>
      <path d="M75 73 Q80 78 85 73" stroke={eyeColor} strokeWidth="2" strokeLinecap="round" fill="none"/>
      <ellipse cx="60" cy="68" rx="6" ry="4" fill={cheekColor} opacity="0.5"/>
      <ellipse cx="100" cy="68" rx="6" ry="4" fill={cheekColor} opacity="0.5"/>
      <ellipse cx="52" cy="108" rx="12" ry="8" fill={skinColor} transform="rotate(-15 52 108)"/>
      <ellipse cx="108" cy="108" rx="12" ry="8" fill={skinColor} transform="rotate(15 108 108)"/>
      <circle cx="48" cy="115" r="6" fill={cheekColor} opacity="0.6"/>
      <circle cx="112" cy="115" r="6" fill={cheekColor} opacity="0.6"/>
    </svg>
  )
}

// ─── Step indicator ───
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i + 1 < current ? "w-4 bg-[#2cb5a0]" : i + 1 === current ? "w-6 bg-[#2cb5a0]" : "w-1.5 bg-[#c5ddd6]"
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

  // ─── Global state ───
  const [loading, setLoading] = useState<"google" | "telegram" | "email" | "credentials" | "register" | null>(null)
  const [error, setError] = useState("")

  // ─── View state ───
  const [view, setView] = useState<View>("login")

  // ─── Email + Password ───
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // ─── Registration uses email OTP flow (shared state above) ───

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
      else if (result?.ok) { router.push("/"); router.refresh() }
    } catch { setError("Koneksi gagal. Periksa internet kamu."); setLoading(null) }
  }

  // Registration now uses handleEmailRequest (email OTP)

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
  function goBack() { setView("login"); setError(""); resetTelegram(); resetEmail() }

  // ═══════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════
  return (
    <>
      <style>{clayStyles}</style>
      <div className="clay-bg flex flex-col items-center justify-center p-6">
        <div className="clay-cloud clay-cloud-1" />
        <div className="clay-cloud clay-cloud-2" />
        <div className="clay-plant-left">
          <div className="clay-leaves">
            <div className="clay-leaf clay-leaf-1" />
            <div className="clay-leaf clay-leaf-2" />
            <div className="clay-leaf clay-leaf-3" />
          </div>
          <div className="clay-pot" />
        </div>
        <div className="clay-flower-right">
          <div className="clay-fpot" />
          <div className="clay-fstem" />
        </div>

        {/* ═══ CARD ═══ */}
        <div className="clay-card">
          {/* ─── Mascot ─── */}
          <div className="clay-mascot">
            <FinWiseCat />
          </div>

          {/* ─── Header ─── */}
          <div className="text-center mb-6 mt-[30px]">
            <span className="clay-heart">💗</span>
            <div className="clay-header">
              <h1 className="flex items-center justify-center flex-wrap gap-0.5">
                <span className="clay-sparkle">✧</span>
                <span className="clay-sparkle">✧</span>
                <span className="clay-sparkle">✧</span>
                {view === "register" ? "Buat Akun" : view === "forgot" ? "Reset Password" : "Selamat Datang"}
                <span className="clay-sparkle">✧</span>
                <span className="clay-sparkle">✧</span>
                <span className="clay-sparkle">✧</span>
              </h1>
              <p className="clay-subtitle">
                {view === "register"
                  ? "Mulai perjalananmu."
                  : view === "forgot"
                    ? "Kami bantu reset password."
                    : "Masuk untuk melanjutkan."}
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

              {/* Google */}
              <button className="clay-social-btn mb-3" onClick={handleGoogleLogin} disabled={isLoading}>
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

              {/* Telegram & Email OTP di-collapse */}
              <div className="flex gap-2 mb-4">
                <button className="clay-social-btn flex-1" style={{ height: 42, fontSize: 13 }}
                  onClick={() => { setView("telegram"); setError("") }} disabled={isLoading}>
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
                    <path fill="#229ED9" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.97 1.25-5.56 3.67-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 3.99-1.74 6.65-2.89 7.98-3.44 3.8-1.58 4.59-1.86 5.1-1.87.11 0 .37.03.54.17.14.12.18.28.2.47-.01.06.01.24 0 .36z" />
                  </svg>
                  <span>Telegram</span>
                </button>
                <button className="clay-social-btn flex-1" style={{ height: 42, fontSize: 13 }}
                  onClick={() => { setView("email-otp"); setError("") }} disabled={isLoading}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#1a8f7d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <span>Email OTP</span>
                </button>
              </div>

              {/* Daftar */}
              <div className="clay-footer mt-0">
                Belum punya akun? <button onClick={() => { setView("register"); setError("") }} className="font-800 underline underline-offset-2">Daftar</button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════
              REGISTER VIEW (Email OTP)
          ═══════════════════════════════════════ */}
          {view === "register" && emailStep === "idle" && (
            <div className="space-y-4">
              <p className="text-sm text-center text-[#6b9a91]">Masukkan email untuk mendaftar ✉️</p>
              <div className="clay-input-group">
                <div className="clay-input-icon">
                  <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
                </div>
                <input type="email" className="clay-input-field" placeholder="Email kamu"
                  value={email} onChange={(e) => { setEmail(e.target.value); setError("") }}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailRequest()} disabled={isLoading}
                  autoFocus
                />
              </div>
              <button className="clay-btn" onClick={() => handleEmailRequest()} disabled={isLoading || !email.trim()}>
                {loading === "email" ? <Loader2 className="size-5 animate-spin mx-auto" /> : "Kirim Kode OTP"}
              </button>
              <div className="text-center mt-4">
                <button onClick={goBack}
                  className="text-xs text-[#6b9a91] hover:text-[#1a3d36] transition flex items-center justify-center gap-1 mx-auto font-600">
                  <ArrowLeft className="size-3" /> Sudah punya akun? Masuk
                </button>
              </div>
            </div>
          )}

          {view === "register" && emailStep === "sent" && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-sm text-[#6b9a91]">Kode OTP dikirim ke email ✨</p>
                <p className="text-xs text-[#82b0a6] font-medium">{email}</p>
              </div>
              <div className="flex gap-2">
                <input ref={emailOtpRef} type="text" placeholder="• • • • • •" maxLength={6} inputMode="numeric"
                  value={emailCode} onChange={(e) => { setEmailCode(e.target.value.replace(/\D/g, "")); setError("") }}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailVerify()}
                  className="flex-1 rounded-xl border border-[#8eddd0]/50 bg-[#e2f3ef] px-4 py-3.5 text-center text-xl tracking-[0.5em] font-mono outline-none transition-all focus:border-[#2cb5a0] focus:ring-2 focus:ring-[#2cb5a0]/20" />
                <button onClick={handleEmailVerify} disabled={isLoading || emailCode.length < 6}
                  className="flex items-center justify-center rounded-xl bg-[#2cb5a0] px-4 py-3.5 text-white transition-all hover:bg-[#1a8f7d] disabled:opacity-50">
                  {loading === "email" ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle className="size-5" />}
                </button>
              </div>
              <button onClick={() => { setEmailStep("idle"); setEmailCode(""); setError("") }}
                className="flex w-full items-center justify-center gap-1.5 text-xs text-[#6b9a91] hover:text-[#1a3d36] transition py-1">
                <ArrowLeft className="size-3" /> Ubah email
              </button>
            </div>
          )}

          {view === "register" && emailStep === "done" && (
            <div className="text-center space-y-3 py-6 animate-[slideUp_0.3s_ease]">
              <CheckCircle className="size-14 mx-auto text-[#2cb5a0]" />
              <p className="text-sm font-bold text-[#1a8f7d]">Akun berhasil dibuat! 🎉</p>
              <p className="text-xs text-[#6b9a91]">Mengalihkan ke dashboard...</p>
            </div>
          )}

          {/* ═══════════════════════════════════════
              FORGOT VIEW
          ═══════════════════════════════════════ */}
          {view === "forgot" && (
            <div className="text-center space-y-4 py-4">
              <div className="rounded-xl border border-[#8eddd0]/30 bg-[#e8f7f3] p-4">
                <p className="text-sm text-[#6b9a91]">Reset password segera hadir! 🛠️</p>
                <p className="text-xs text-[#82b0a6] mt-2">
                  Sementara, hubungi admin via <a href="https://t.me/ainsyir" target="_blank" rel="noopener noreferrer" className="text-[#2cb5a0] font-bold hover:underline">@ainsyir</a>
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
              <p className="text-sm text-center text-[#6b9a91]">Masukkan username Telegram kamu 📱</p>
              <div className="flex gap-2">
                <input type="text" placeholder="Username (tanpa @)"
                  value={tgUsername} onChange={(e) => { setTgUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '')); setError("") }}
                  onKeyDown={(e) => e.key === "Enter" && handleTelegramRequest()} maxLength={50}
                  className="flex-1 rounded-xl border-2 border-[#e2f3ef] bg-[#e2f3ef] px-4 py-3 text-sm outline-none transition-all focus:border-[#8eddd0] focus:ring-2 focus:ring-[#2cb5a0]/20"
                  style={{ fontFamily: "inherit", color: "#1a3d36", fontWeight: 600, boxShadow: "inset 0 3px 8px rgba(0,0,0,0.06)" }}
                />
                <button onClick={handleTelegramRequest} disabled={isLoading}
                  className="flex items-center justify-center rounded-xl bg-[#229ED9] px-4 py-3 text-white transition-all hover:bg-[#1d8ec4] disabled:opacity-50">
                  {loading === "telegram" ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-4" />}
                </button>
              </div>
              {botUrl && (
                <div className="rounded-xl border border-[#2cb5a0]/30 bg-[#e8f7f3] p-4">
                  <p className="text-sm font-medium text-[#1a3d36]">🤖 Bot belum aktif!</p>
                  <p className="text-xs text-[#6b9a91] mt-1">Mulai chat dengan bot FinWise dulu ya.</p>
                  <a href={botUrl} target="_blank" rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#229ED9] px-4 py-2.5 text-sm font-medium text-white mt-2 transition hover:bg-[#1d8ec4]">
                    <MessageCircle className="size-4" /> Buka Bot
                  </a>
                </div>
              )}
              {channelUrl && (
                <div className="rounded-xl border border-[#2cb5a0]/30 bg-[#e8f7f3] p-4">
                  <p className="text-sm font-medium text-[#1a3d36]">📢 Gabung channel dulu!</p>
                  <a href={channelUrl} target="_blank" rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#229ED9] px-4 py-2.5 text-sm font-medium text-white mt-2 transition hover:bg-[#1d8ec4]">
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
                <p className="text-sm text-[#6b9a91]">Kode 6 digit dikirim via Telegram ✨</p>
                <p className="text-xs text-[#82b0a6]">@{tgUsername}</p>
              </div>
              <div className="flex gap-2">
                <input ref={otpRef} type="text" placeholder="• • • • • •" maxLength={6} inputMode="numeric"
                  value={tgCode} onChange={(e) => { setTgCode(e.target.value.replace(/\D/g, "")); setError("") }}
                  onKeyDown={(e) => e.key === "Enter" && handleTelegramVerify()}
                  className="clay-otp-input flex-1" />
                <button onClick={handleTelegramVerify} disabled={isLoading || tgCode.length < 6}
                  className="flex items-center justify-center rounded-xl bg-[#2cb5a0] px-4 py-3.5 text-white transition-all hover:bg-[#1a8f7d] disabled:opacity-50">
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
              <CheckCircle className="size-12 mx-auto text-[#2cb5a0]" />
              <p className="text-sm font-medium text-[#1a8f7d]">Terverifikasi! Mengalihkan...</p>
            </div>
          )}

          {/* ═══════════════════════════════════════
              EMAIL OTP VIEW
          ═══════════════════════════════════════ */}
          {view === "email-otp" && emailStep === "idle" && (
            <div className="space-y-4">
              <StepDots current={1} total={2} />
              <p className="text-sm text-center text-[#6b9a91]">Masukkan alamat email ✉️</p>
              <div className="flex gap-2">
                <input type="email" placeholder="email@contoh.com"
                  value={email} onChange={(e) => { setEmail(e.target.value); setError("") }}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailRequest()}
                  className="flex-1 rounded-xl border-2 border-[#e2f3ef] bg-[#e2f3ef] px-4 py-3 text-sm outline-none transition-all focus:border-[#8eddd0] focus:ring-2 focus:ring-[#2cb5a0]/20"
                  style={{ fontFamily: "inherit", color: "#1a3d36", fontWeight: 600, boxShadow: "inset 0 3px 8px rgba(0,0,0,0.06)" }}
                />
                <button onClick={handleEmailRequest} disabled={isLoading}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[#2cb5a0] px-3 py-3 text-sm font-semibold text-white transition-all hover:bg-[#1a8f7d] disabled:opacity-50">
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
              <p className="text-sm text-center text-[#6b9a91]">Kode dikirim ke email ✨</p>
              <p className="text-xs text-center text-[#82b0a6] font-medium">{email}</p>
              <div className="flex gap-2">
                <input ref={emailOtpRef} type="text" placeholder="• • • • • •" maxLength={6} inputMode="numeric"
                  value={emailCode} onChange={(e) => { setEmailCode(e.target.value.replace(/\D/g, "")); setError("") }}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailVerify()}
                  className="clay-otp-input flex-1" />
                <button onClick={handleEmailVerify} disabled={isLoading || emailCode.length < 6}
                  className="flex items-center justify-center rounded-xl bg-[#2cb5a0] px-4 py-3.5 text-white transition-all hover:bg-[#1a8f7d] disabled:opacity-50">
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
              <CheckCircle className="size-12 mx-auto text-[#2cb5a0]" />
              <p className="text-sm font-medium text-[#1a8f7d]">Login berhasil! Mengalihkan...</p>
            </div>
          )}

          {/* ─── Footer ─── */}
          <div className="text-center mt-5 pt-4 border-t border-[#8eddd0]/30">
            <p className="flex items-center justify-center gap-1.5 text-xs text-[#82b0a6]">
              🔒 Terenkripsi & aman
            </p>
            <p className="text-xs text-[#a0c8be] mt-1">
              Akun otomatis dibuat saat login pertama ·{" "}
              <a href="https://t.me/ainsyir" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#2cb5a0] font-bold hover:underline">
                <HelpCircle className="size-3" /> Butuh bantuan?
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
