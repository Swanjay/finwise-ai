// Brand → logo mapping (auto-generated from ~/logo-indonesia/)
// Used to auto-detect logo when user types a wallet name

const BRAND_LOGOS: Record<string, string> = {
  // Banks
  'allo': '/logos/bank/Allo.svg',
  'bca': '/logos/bank/BCA.svg',
  'bca digital': '/logos/bank/BCA_Digital.svg',
  'bca syariah': '/logos/bank/BCA_Syariah.svg',
  'bjb': '/logos/bank/BJB.svg',
  'bni': '/logos/bank/BNI.svg',
  'bri': '/logos/bank/BRI.svg',
  'bsi': '/logos/bank/BSI.svg',
  'btn': '/logos/bank/BTN.svg',
  'btn syariah': '/logos/bank/BTN_Syariah.svg',
  'btpn': '/logos/bank/BTPN.svg',
  'btpn syariah': '/logos/bank/BTPN_Syariah.svg',
  'bank dki': '/logos/bank/Bank_DKI.svg',
  'bank nagari': '/logos/bank/Bank_Nagari.svg',
  'blu bca': '/logos/bank/Blu_BCA.svg',
  'blu': '/logos/bank/Blu_BCA.svg',
  'cimb niaga': '/logos/bank/CIMB_Niaga.svg',
  'cimb': '/logos/bank/CIMB_Niaga.svg',
  'commonwealth': '/logos/bank/Commonwealth.svg',
  'dbs': '/logos/bank/DBS.svg',
  'danamon': '/logos/bank/Danamon.svg',
  'hsbc': '/logos/bank/HSBC.svg',
  'icbc': '/logos/bank/ICBC.svg',
  'jago': '/logos/bank/Jago.svg',
  'jenius': '/logos/bank/Jenius.svg',
  'kb bukopin': '/logos/bank/KB_Bukopin.svg',
  'bukopin': '/logos/bank/KB_Bukopin.svg',
  'krom': '/logos/bank/Krom.svg',
  'line bank': '/logos/bank/LINE_Bank.svg',
  'mnc bank': '/logos/bank/MNC_Bank.svg',
  'mandiri': '/logos/bank/Mandiri.svg',
  'mandiri taspen': '/logos/bank/Mandiri_Taspen.svg',
  'maybank': '/logos/bank/Maybank.svg',
  'mega': '/logos/bank/Mega.svg',
  'mega syariah': '/logos/bank/Mega_Syariah.svg',
  'motion banking': '/logos/bank/Motion_Banking.svg',
  'mualamat': '/logos/bank/Mualamat.svg',
  'muamalat': '/logos/bank/Mualamat.svg',
  'nobu': '/logos/bank/NOBU.svg',
  'ocbc nisp': '/logos/bank/OCBC_NISP.svg',
  'ocbc': '/logos/bank/OCBC_NISP.svg',
  'panin': '/logos/bank/PaninBank.svg',
  'paninbank': '/logos/bank/PaninBank.svg',
  'permata': '/logos/bank/Permata.svg',
  'seabank': '/logos/bank/SeaBank.svg',
  'sinarmas': '/logos/bank/Sinarmas.svg',
  'standard chartered': '/logos/bank/Standard_Chartered.svg',
  'superbank': '/logos/bank/Superbank.svg',
  'uob': '/logos/bank/UOB.svg',

  // E-Wallets
  'astra pay': '/logos/ewallet/Astra_Pay.svg',
  'dana': '/logos/ewallet/DANA.svg',
  'doku': '/logos/ewallet/DOKU.svg',
  'dipay': '/logos/ewallet/Dipay.svg',
  'gopay': '/logos/ewallet/Gopay.svg',
  'go pay': '/logos/ewallet/Gopay.svg',
  'gojek': '/logos/ewallet/Gopay.svg',
  'i.saku': '/logos/ewallet/I.Saku.svg',
  'isaku': '/logos/ewallet/I.Saku.svg',
  'jakone pay': '/logos/ewallet/JakOne_Pay.svg',
  'jakone': '/logos/ewallet/JakOne_Pay.svg',
  'kaspro': '/logos/ewallet/Kaspro.svg',
  'linkaja': '/logos/ewallet/LinkAja.svg',
  'link aja': '/logos/ewallet/LinkAja.svg',
  'motion pay': '/logos/ewallet/Motion_Pay.svg',
  'netzme': '/logos/ewallet/Netzme.svg',
  'otto pay': '/logos/ewallet/OTTO_Pay.svg',
  'ovo': '/logos/ewallet/OVO.svg',
  'paydia': '/logos/ewallet/Paydia.svg',
  'paytren': '/logos/ewallet/Paytren.svg',
  'shopee pay': '/logos/ewallet/Shopee_Pay.svg',
  'shopeepay': '/logos/ewallet/Shopee_Pay.svg',
  'shopee': '/logos/ewallet/Shopee_Pay.svg',
  'speedcash': '/logos/ewallet/SpeedCash.svg',
  'truemoney': '/logos/ewallet/TrueMoney.svg',
  'uangku': '/logos/ewallet/Uangku.svg',
  'yukk': '/logos/ewallet/Yukk.svg',
}

/**
 * Auto-detect logo from wallet name.
 * Returns the logo path if a matching brand is found, otherwise undefined.
 */
export function detectLogo(walletName: string): string | undefined {
  if (!walletName || walletName.trim().length < 2) return undefined
  const normalized = walletName.trim().toLowerCase()
  
  // Exact match first
  if (BRAND_LOGOS[normalized]) return BRAND_LOGOS[normalized]
  
  // Partial match — check if any brand name is contained in the input
  for (const [brand, logo] of Object.entries(BRAND_LOGOS)) {
    if (normalized.includes(brand) || brand.includes(normalized)) {
      return logo
    }
  }
  
  return undefined
}

/**
 * Get all available brand names (for suggestions/autocomplete)
 */
export function getAllBrands(): string[] {
  return Object.keys(BRAND_LOGOS).filter((v, i, a) => a.indexOf(v) === i)
}
