# 🚒 Fire Drill Report — FinWise

**App:** FinWise (Financial AI Assistant)
**Platform:** Web (Next.js) + Mobile APK (Capacitor)
**URL:** finwise-ai-teal.vercel.app
**Date:** 2026-06-16
**Tester:** San (AI Agent)

---

## 🎯 Main Goal

FinWise harus bisa:
- ✅ Login & autentikasi dengan aman
- ✅ CRUD pengeluaran (tambah, edit, hapus)
- ✅ CRUD pengeluaran rutin (recurring)
- ✅ Scan struk belanja (OCR)
- ✅ Generate laporan keuangan
- ✅ Hitung financial score
- ✅ AI advisor (chat dengan AI)
- ✅ Export data

---

## 👥 Critical User Actions

| # | Action | Priority |
|---|--------|----------|
| 1 | Login (Telegram/Email) | 🔴 Critical |
| 2 | Tambah pengeluaran | 🔴 Critical |
| 3 | Edit pengeluaran | 🟡 High |
| 4 | Hapus pengeluaran | 🟡 High |
| 5 | Tambah recurring | 🟡 High |
| 6 | Scan struk | 🟢 Medium |
| 7 | Lihat laporan | 🟢 Medium |
| 8 | Chat AI advisor | 🟢 Medium |
| 9 | Export data | 🟢 Medium |
| 10 | Ganti settings | 🔵 Low |

---

## 🌐 External Services

| Service | Fungsi | Critical? |
|---------|--------|-----------|
| **NextAuth** | Autentikasi | 🔴 Ya |
| **Supabase** | Database | 🔴 Ya |
| **Telegram Bot API** | Login Telegram | 🔴 Ya |
| **OCR.space** | Scan struk | 🟢 Opsional |
| **AI API** (Groq/Dahono) | Chat advisor | 🟢 Opsional |
| **Vercel** | Hosting | 🔴 Ya |
| **Capacitor** | Mobile APK | 🟢 Opsional |

---

## 🔥 Fire Drill Scenarios

### 🔐 Scenario 1: Login Gagal

**Apa yang gagal:**
- User tidak bisa login via Telegram
- Session expired saat sedang pakai app
- Signature verification gagal

**Dampak ke user:**
- ❌ Tidak bisa akses halaman dilindungi
- ❌ Data tidak bisa dimuat
- ❌ Bingung kenapa tiba-tiba logout

**Dampak ke sistem:**
- ❌ Protected API routes gagal
- ❌ Dashboard tidak load
- ❌ Session state tidak jelas

**Response aman:**
- ✅ Blokir konten pribadi
- ✅ Tampilkan pesan "Silakan login ulang"
- ✅ Redirect ke login SETelah auth state diketahui
- ✅ Jangan flash data pribadi sebentar

**Pesan ke user:**
> "Sesi Anda telah berakhir. Silakan login ulang untuk melanjutkan."

**Recovery:**
1. Redirect ke `/login`
2. Simpan intended destination (URL tujuan)
3. Setelah login, redirect ke tujuan semula
4. Retry session check sekali

**Test:**
- Buka `/expenses` dengan expired session
- Expected: Redirect ke login, tidak flash data

---

### 💳 Scenario 2: Tambah Pengeluaran Gagal

**Apa yang gagal:**
- API POST ke database gagal
- Network timeout saat submit
- Database connection error

**Dampak ke user:**
- ❌ Data pengeluaran tidak tersimpan
- ❌ User bingung apakah data masuk atau tidak
- ❌ Bisa submit duplikat kalau retry

**Dampak ke sistem:**
- ❌ Data tidak konsisten
- ❌ Bisa ada record kosong/ganda
- ❌ Laporan salah

**Response aman:**
- ✅ Jangan tampilkan "Berhasil" kalau gagal
- ✅ Tampilkan error yang jelas
- ✅ Simpan input user di form (jangan di-clear)
- ✅ Beri tombol "Coba Lagi"

**Pesan ke user:**
> "Pengeluaran gagal disimpan. Silakan coba lagi."

**Recovery:**
1. Tampilkan error message
2. Biarkan form tetap terisi
3. Beri tombol retry
4. Cek status server sebelum retry

**Test:**
- Matikan internet, submit form
- Expected: Error message, form tetap terisi, ada retry

---

### 📷 Scenario 3: Scan Struk Gagal

**Apa yang gagal:**
- OCR API timeout
- Gambar terlalu besar/blur
- API key OCR expired

**Dampak ke user:**
- ❌ Tidak bisa scan struk otomatis
- ❌ Harus input manual

**Dampak ke sistem:**
- ❌ Fitur scan tidak berfungsi
- ❌ Error logged

**Response aman:**
- ✅ Tampilkan pesan "Scan gagal, silakan input manual"
- ✅ Jangan hang/tetap loading
- ✅ Beri opsi input manual

**Pesan ke user:**
> "Scan struk gagal. Silakan input pengeluaran secara manual."

**Recovery:**
1. Tampilkan error
2. Beri tombol "Input Manual"
3. Log error untuk debugging

**Test:**
- Upload gambar blur/terlalu kecil
- Expected: Error message, opsi input manual

---

### 🤖 Scenario 4: AI Advisor Error

**Apa yang gagal:**
- AI API timeout
- API key expired/quota habis
- Response tidak valid

**Dampak ke user:**
- ❌ Tidak bisa chat dengan AI
- ❌ Fitur advisor tidak berfungsi

**Dampak ke sistem:**
- ❌ Chat tidak bisa dilanjutkan
- ❌ Error logged

**Response aman:**
- ✅ Tampilkan pesan "AI sedang sibuk"
- ✅ Beri saran alternatif (lihat laporan manual)
- ✅ Jangan crash app

**Pesan ke user:**
> "AI advisor sedang tidak tersedia. Silakan coba beberapa saat lagi atau lihat laporan di menu Reports."

**Recovery:**
1. Tampilkan error friendly
2. Beri alternatif (menu lain)
3. Retry button

**Test:**
- Matikan AI API key
- Expected: Error message, alternatif ditampilkan

---

### 📊 Scenario 5: Laporan Gagal Load

**Apa yang gagal:**
- Database query timeout
- Data terlalu besar
- Chart library error

**Dampak ke user:**
- ❌ Tidak bisa lihat laporan
- ❌ Tidak bisa analisis keuangan

**Dampak ke sistem:**
- ❌ Halaman reports blank
- ❌ Error logged

**Response aman:**
- ✅ Tampilkan "Loading..." dengan timeout
- ✅ Kalau timeout, tampilkan error
- ✅ Beri opsi filter (bulan/tahun) untuk kurangi data

**Pesan ke user:**
> "Laporan gagal dimuat. Coba filter berdasarkan bulan tertentu."

**Recovery:**
1. Tampilkan error
2. Beri filter opsi
3. Retry button

**Test:**
- Tambah 1000+ data, buka reports
- Expected: Loading timeout, filter opsi muncul

---

### 🔁 Scenario 6: Recurring Transaction Gagal

**Apa yang gagal:**
- Cron job tidak jalan
- Database update gagal
- Duplicate entry

**Dampak ke user:**
- ❌ Pengeluaran rutin tidak tercatat otomatis
- ❌ Laporan tidak akurat

**Dampak ke sistem:**
- ❌ Data tidak sinkron
- ❌ Bisa ada duplikat

**Response aman:**
- ✅ Cek status recurring di UI
- ✅ Tampilkan "Last run: ..." 
- ✅ Beri tombol "Run Now" manual

**Pesan ke user:**
> "Pengeluaran rutin terakhir dijalankan: [tanggal]. Klik 'Jalankan Sekarang' untuk update manual."

**Recovery:**
1. Tampilkan status recurring
2. Beri tombol manual trigger
3. Log setiap run

**Test:**
- Matikan cron job, cek UI
- Expected: Status terlihat, tombol manual ada

---

### 📱 Scenario 7: APK Crash

**Apa yang gagal:**
- Capacitor bridge error
- Native plugin gagal
- Memory leak

**Dampak ke user:**
- ❌ App force close
- ❌ Data hilang (belum tersimpan)

**Dampak ke sistem:**
- ❌ Crash report
- ❌ User experience buruk

**Response aman:**
- ✅ Auto-save draft sebelum action
- ✅ Crash reporter (Sentry/Bugsnag)
- ✅ Graceful degradation (fallback ke web)

**Pesan ke user:**
> "Aplikasi mengalami masalah. Data draft Anda sudah disimpan. Silakan buka kembali."

**Recovery:**
1. Auto-restart app
2. Load draft data
3. Kirim crash report

**Test:**
- Force close app saat edit
- Expected: Draft tersimpan, bisa dilanjutkan

---

### 🌐 Scenario 8: Offline Mode

**Apa yang gagal:**
- Semua API calls gagal
- Tidak bisa sync data

**Dampak ke user:**
- ❌ Tidak bisa akses data
- ❌ Tidak bisa input baru

**Dampak ke sistem:**
- ❌ Data tidak sync
- ❌ Bisa ada conflict

**Response aman:**
- ✅ Deteksi offline state
- ✅ Tampilkan banner "Anda sedang offline"
- ✅ Simpan input lokal (localStorage/IndexedDB)
- ✅ Sync saat online kembali

**Pesan ke user:**
> "Anda sedang offline. Data akan disimpan lokal dan di-sync saat online kembali."

**Recovery:**
1. Deteksi online kembali
2. Sync data lokal ke server
3. Handle conflict jika ada

**Test:**
- Matikan internet, input data
- Expected: Data tersimpan lokal, sync saat online

---

## 📋 Failure Categories Checklist

| Category | Covered? | Scenario |
|----------|----------|----------|
| Auth failure | ✅ | #1 |
| Session failure | ✅ | #1 |
| Permission failure | ⚠️ | (Tambah manual) |
| Payment failure | N/A | (Belum ada payment) |
| API failure | ✅ | #2, #3, #4, #5 |
| Database failure | ✅ | #2, #5 |
| Storage failure | ✅ | #3 |
| Email failure | N/A | (Belum ada email) |
| Webhook failure | ⚠️ | (Tambah manual) |
| AI API failure | ✅ | #4 |
| Network loss | ✅ | #8 |
| Timeout | ✅ | #2, #3, #5 |
| Bad data | ⚠️ | (Tambah manual) |
| Duplicate submit | ✅ | #2 |
| Partial success | ⚠️ | (Tambah manual) |

---

## 🧪 Test Cases

### Test 1: Auth Failure
```
Scenario: Login gagal
Trigger: Matikan NEXTAUTH_SECRET
Expected User: Redirect ke login, pesan error jelas
Expected System: Tidak ada data bocor, error logged
Check: Keamanan auth
```

### Test 2: API Timeout
```
Scenario: Tambah pengeluaran timeout
Trigger: Network throttle (3G), submit form
Expected User: Error message, form tetap terisi, retry button
Expected System: Tidak ada duplikat, error logged
Check: Handling timeout
```

### Test 3: OCR Failure
```
Scenario: Scan struk gagal
Trigger: Upload gambar corrupt/blur
Expected User: Error message, opsi input manual
Expected System: Error logged, tidak crash
Check: Graceful degradation
```

### Test 4: AI API Failure
```
Scenario: AI advisor error
Trigger: Matikan AI API key
Expected User: Error message, alternatif ditampilkan
Expected System: Error logged, app tidak crash
Check: Fallback behavior
```

### Test 5: Offline Submit
```
Scenario: Submit saat offline
Trigger: Matikan internet, submit form
Expected User: Warning "offline", data tersimpan lokal
Expected System: Data di-localStorage, sync saat online
Check: Offline support
```

### Test 6: Duplicate Submit
```
Scenario: Double click submit
Trigger: Klik submit 2x cepat
Expected User: Hanya 1 record tersimpan
Expected System: Deduplication aktif
Check: Prevent duplikat
```

### Test 7: Large Data
```
Scenario: Load 1000+ records
Trigger: Tambah banyak data, buka reports
Expected User: Loading timeout, filter opsi
Expected System: Pagination aktif, tidak crash
Check: Performance
```

---

## 🔧 Build Notes

### Files to Inspect
```
app/api/expenses/route.ts      — CRUD pengeluaran
app/api/recurring/route.ts     — Recurring transactions
app/api/scan-receipt/route.ts  — OCR scan
app/api/advisor/route.ts       — AI advisor
app/api/reports/route.ts       — Laporan
auth.ts                        — NextAuth config
middleware.ts                  — Auth middleware
lib/supabase.ts                — Database client
```

### Routes to Test
```
/login          — Auth flow
/expenses       — CRUD pengeluaran
/recurring      — Recurring transactions
/reports        — Laporan
/score          — Financial score
/api/*          — Semua API routes
```

### Error States to Add
```
- Loading timeout (3 detik)
- API error boundary
- Offline detection
- Session expired handler
- Form validation errors
```

### Logs to Add
```
- Auth failures (login attempt, session expired)
- API errors (timeout, 500, 400)
- OCR failures
- AI API failures
- Database errors
```

---

## ✅ Final Recommendation

### Fire Drill Pertama yang Harus Dijalankan:

1. **🔐 Test expired session**
   - Buka app, tunggu session expired
   - Expected: Redirect ke login, tidak flash data

2. **🌐 Test failed API request**
   - Matikan internet, submit form
   - Expected: Error message, form tetap terisi

3. **📷 Test failed OCR**
   - Upload gambar blur
   - Expected: Error message, opsi input manual

4. **🤖 Test failed AI**
   - Matikan AI API key
   - Expected: Error message, alternatif ditampilkan

5. **📱 Test offline submit**
   - Mode airplane, input data
   - Expected: Data tersimpan lokal

6. **🔄 Test duplicate submit**
   - Double click submit
   - Expected: Hanya 1 record

7. **🚫 Test permission denied**
   - Akses halaman admin tanpa auth
   - Expected: Redirect ke login

---

## 📊 Summary

| Aspect | Status |
|--------|--------|
| Critical actions | ✅ 10 teridentifikasi |
| External services | ✅ 7 teridentifikasi |
| Disaster scenarios | ✅ 8 skenario |
| User impact | ✅ Didefinisikan |
| System impact | ✅ Didefinisikan |
| Safe responses | ✅ Didefinisikan |
| Recovery paths | ✅ 8 path |
| User messages | ✅ 8 pesan |
| Logging needs | ✅ Didefinisikan |
| Test cases | ✅ 7 test |
| First fire drill | ✅ Bisa langsung dijalankan |

---

**Next Steps:**
1. Jalankan test #1 (expired session) dulu
2. Tambahkan error boundary di semua halaman
3. Implementasi offline detection
4. Tambahkan crash reporter (Sentry)
5. Setup monitoring (Grafana/Prometheus)

**Report generated by:** San (AI Agent)
**Date:** 2026-06-16
