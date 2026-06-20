// Wallet Logo Auto-Detect
// Maps brand names (lowercase) to logo paths
// Priority: local SVG > Logo.dev CDN

const LOGO_DEV_TOKEN = 'pk_ZniFVl8bQQa8gnSqtILNDA'

// ─── Local SVG logos (from ~/logo-indonesia/) ───
const LOCAL_BANK_LOGOS: Record<string, string> = {
  'bca': '/logos/bank/BCA.svg',
  'bca digital': '/logos/bank/BCA_Digital.svg',
  'bca syariah': '/logos/bank/BCA_Syariah.svg',
  'mandiri': '/logos/bank/Mandiri.svg',
  'bri': '/logos/bank/BRI.svg',
  'bni': '/logos/bank/BNI.svg',
  'bsi': '/logos/bank/BSI.svg',
  'btn': '/logos/bank/BTN.svg',
  'btn syariah': '/logos/bank/BTN_Syariah.svg',
  'btpn': '/logos/bank/BTPN.svg',
  'btpn syariah': '/logos/bank/BTPN_Syariah.svg',
  'bjb': '/logos/bank/BJB.svg',
  'seabank': '/logos/bank/SeaBank.svg',
  'cimb': '/logos/bank/CIMB_Niaga.svg',
  'cimb niaga': '/logos/bank/CIMB_Niaga.svg',
  'cimb syariah': '/logos/bank/CIMB_Niaga_Syariah.svg',
  'danamon': '/logos/bank/Danamon.svg',
  'danamon syariah': '/logos/bank/Danamon_Syariah.svg',
  'ocbc': '/logos/bank/OCBC_NISP.svg',
  'ocbc nisp': '/logos/bank/OCBC_NISP.svg',
  'permata': '/logos/bank/Permata.svg',
  'permata bank': '/logos/bank/Permata.svg',
  'jago': '/logos/bank/Jago.svg',
  'jenius': '/logos/bank/Jenius.svg',
  'bukopin': '/logos/bank/KB_Bukopin.svg',
  'bukopin syariah': '/logos/bank/KB_Bukopin_Syariah.svg',
  'maybank': '/logos/bank/Maybank.svg',
  'mega': '/logos/bank/Mega.svg',
  'mega syariah': '/logos/bank/Mega_Syariah.svg',
  'sinarmas': '/logos/bank/Sinarmas.svg',
  'sinarmas syariah': '/logos/bank/Sinarmas_Syariah.svg',
  'uob': '/logos/bank/UOB.svg',
  'dbs': '/logos/bank/DBS.svg',
  'hsbc': '/logos/bank/HSBC.svg',
  'standard chartered': '/logos/bank/Standard_Chartered.svg',
  'commonwealth': '/logos/bank/Commonwealth.svg',
  'line bank': '/logos/bank/LINE_Bank.svg',
  'line': '/logos/bank/LINE_Bank.svg',
  'allo': '/logos/bank/Allo.svg',
  'allo bank': '/logos/bank/Allo.svg',
  'bank dki': '/logos/bank/Bank_DKI.svg',
  'dki': '/logos/bank/Bank_DKI.svg',
  'bank nagari': '/logos/bank/Bank_Nagari.svg',
  'nagari': '/logos/bank/Bank_Nagari.svg',
  'bank bali': '/logos/bank/Bank_BPD_Bali.svg',
  'bank diy': '/logos/bank/Bank_BPD_DIY.svg',
  'bank jateng': '/logos/bank/Bank_BPD_Jateng.svg',
  'bank jatim': '/logos/bank/Bank_BPD_Jatim.svg',
  'bank papua': '/logos/bank/Bank_BPD_Papua.svg',
  'bank sulselbar': '/logos/bank/Bank_BPD_Sulselbar.svg',
  'bank capital': '/logos/bank/Bank_Capital.svg',
  'bank ina': '/logos/bank/Bank_INA.svg',
  'bank mayapada': '/logos/bank/Bank_Mayapada.svg',
  'bank raya': '/logos/bank/Bank_Raya.svg',
  'bank woori': '/logos/bank/Bank_Woori_Saudara.svg',
  'blu': '/logos/bank/Blu_BCA.svg',
  'blu bca': '/logos/bank/Blu_BCA.svg',
  'krom': '/logos/bank/Krom.svg',
  'mnc': '/logos/bank/MNC_Bank.svg',
  'mnc bank': '/logos/bank/MNC_Bank.svg',
  'motion banking': '/logos/bank/Motion_Banking.svg',
  'muamalat': '/logos/bank/Mualamat.svg',
  'mualamat': '/logos/bank/Mualamat.svg',
  'nobu': '/logos/bank/NOBU.svg',
  'nobu bank': '/logos/bank/NOBU.svg',
  'panin': '/logos/bank/PaninBank.svg',
  'panin bank': '/logos/bank/PaninBank.svg',
  'superbank': '/logos/bank/Superbank.svg',
  'mandiri taspen': '/logos/bank/Mandiri_Taspen.svg',
  'icbc': '/logos/bank/ICBC.svg',
  'mufg': '/logos/bank/MUFG.svg',
  'mizuho': '/logos/bank/Mizuho_Bank.svg',
}

const LOCAL_EWALLET_LOGOS: Record<string, string> = {
  'gopay': '/logos/ewallet/Gopay.svg',
  'go pay': '/logos/ewallet/Gopay.svg',
  'ovo': '/logos/ewallet/OVO.svg',
  'dana': '/logos/ewallet/DANA.svg',
  'shopeepay': '/logos/ewallet/Shopee_Pay.svg',
  'shopee pay': '/logos/ewallet/Shopee_Pay.svg',
  'shopee': '/logos/ewallet/Shopee_Pay.svg',
  'linkaja': '/logos/ewallet/LinkAja.svg',
  'link aja': '/logos/ewallet/LinkAja.svg',
  'doku': '/logos/ewallet/DOKU.svg',
  'astra pay': '/logos/ewallet/Astra_Pay.svg',
  'astrapay': '/logos/ewallet/Astra_Pay.svg',
  'dipay': '/logos/ewallet/Dipay.svg',
  'i.saku': '/logos/ewallet/I.Saku.svg',
  'isaku': '/logos/ewallet/I.Saku.svg',
  'jakone': '/logos/ewallet/JakOne_Pay.svg',
  'jakone pay': '/logos/ewallet/JakOne_Pay.svg',
  'kaspro': '/logos/ewallet/Kaspro.svg',
  'motion pay': '/logos/ewallet/Motion_Pay.svg',
  'netzme': '/logos/ewallet/Netzme.svg',
  'otto pay': '/logos/ewallet/OTTO_Pay.svg',
  'ottopay': '/logos/ewallet/OTTO_Pay.svg',
  'paydia': '/logos/ewallet/Paydia.svg',
  'paytren': '/logos/ewallet/Paytren.svg',
  'speedcash': '/logos/ewallet/SpeedCash.svg',
  'true money': '/logos/ewallet/TrueMoney.svg',
  'truemoney': '/logos/ewallet/TrueMoney.svg',
  'uangku': '/logos/ewallet/Uangku.svg',
  'yukk': '/logos/ewallet/Yukk.svg',
}

// ─── Logo.dev CDN fallback for brands not in local ───
// Maps brand name → domain for Logo.dev lookup
const LOGODEV_DOMAINS: Record<string, string> = {
  'flip': 'flip.id',
  'grab': 'grab.com',
  'grabpay': 'grab.com',
  'tokopedia': 'tokopedia.com',
  'bukalapak': 'bukalapak.com',
  'blibli': 'blibli.com',
  'traveloka': 'traveloka.com',
  'kredivo': 'kredivo.com',
  'akulaku': 'akulaku.com',
  'indodax': 'indodax.com',
  'pintu': 'pintu.co.id',
  'pluang': 'pluang.com',
  'reekening': 'reekening.com',
  'neobank': 'neobank.co.id',
  'motion': 'motionbanking.co.id',
}

// ─── Main function: get logo URL from wallet name ───
export function getLogoForWalletName(name: string): string | null {
  if (!name || name.trim().length === 0) return null
  
  const normalized = name.trim().toLowerCase()
  
  // 1. Check local bank logos (exact match first)
  if (LOCAL_BANK_LOGOS[normalized]) return LOCAL_BANK_LOGOS[normalized]
  
  // 2. Check local e-wallet logos (exact match)
  if (LOCAL_EWALLET_LOGOS[normalized]) return LOCAL_EWALLET_LOGOS[normalized]
  
  // 3. Partial match — check if input contains any known brand
  for (const [brand, path] of Object.entries(LOCAL_BANK_LOGOS)) {
    if (normalized.includes(brand) || brand.includes(normalized)) return path
  }
  for (const [brand, path] of Object.entries(LOCAL_EWALLET_LOGOS)) {
    if (normalized.includes(brand) || brand.includes(normalized)) return path
  }
  
  // 4. Logo.dev CDN fallback
  if (LOGODEV_DOMAINS[normalized]) {
    return `https://img.logo.dev/${LOGODEV_DOMAINS[normalized]}?token=${LOGO_DEV_TOKEN}&size=128&format=png`
  }
  
  // 5. Try Logo.dev by name (generic fallback)
  // Only for names that look like brand names (not generic like "Dompet 1")
  if (normalized.length >= 3 && !normalized.match(/^(dompet|wallet|rekening|tabungan|akun)\s*\d*$/i)) {
    return `https://img.logo.dev/name:${encodeURIComponent(normalized)}?token=${LOGO_DEV_TOKEN}&size=128&format=png&fallback=monogram`
  }
  
  return null
}

// ─── Get all known brands for autocomplete/suggestions ───
export function getAllKnownBrands(): string[] {
  const local = [...Object.keys(LOCAL_BANK_LOGOS), ...Object.keys(LOCAL_EWALLET_LOGOS)]
  const logodev = Object.keys(LOGODEV_DOMAINS)
  return Array.from(new Set([...local, ...logodev])).sort()
}

// ─── Check if a name matches a known brand ───
export function isKnownBrand(name: string): boolean {
  return getLogoForWalletName(name) !== null
}
