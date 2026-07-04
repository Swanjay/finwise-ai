/**
 * Platform detection — runs client-side only.
 * Detects if the app is running inside a native Capacitor shell (Android/iOS APK).
 * 
 * In native mode, OAuth (Google) will NOT work because it redirects to an
 * external browser. Only email/password, email OTP, and Telegram login work
 * inside the WebView.
 */

export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false
  // Capacitor sets window.Capacitor on native platforms
  return !!(window as any).Capacitor?.isNativePlatform?.() || !!(window as any).Capacitor?.platform
}
