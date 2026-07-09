/**
 * FinWise Secure Storage — AES-GCM encryption for localStorage
 * 
 * Encrypts sensitive localStorage values using Web Crypto API.
 * Key is derived from a device-specific seed stored in a non-sensitive slot.
 * 
 * Usage:
 *   import { secureGet, secureSet, secureRemove } from '@/lib/secure-storage'
 *   secureSet('myKey', { sensitive: 'data' })
 *   const data = secureGet('myKey')
 */

const DB_NAME = 'finwise_secure'
const STORE_NAME = 'keys'
const KEY_ALIAS = 'primary'

async function getOrCreateKey(): Promise<CryptoKey> {
  // Try IndexedDB first (persistent across sessions)
  const stored = await idbGetKey()
  if (stored) {
    return await crypto.subtle.importKey('jwk', stored, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  }

  // Generate new key
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const jwk = await crypto.subtle.exportKey('jwk', key)
  await idbSetKey(jwk)
  return key
}

function idbGetKey(): Promise<JsonWebKey | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const getReq = store.get(KEY_ALIAS)
      getReq.onsuccess = () => resolve(getReq.result || null)
      getReq.onerror = () => resolve(null)
    }
    req.onerror = () => resolve(null)
  })
}

function idbSetKey(jwk: JsonWebKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put(jwk, KEY_ALIAS)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    }
    req.onerror = () => reject(req.error)
  })
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  
  // Pack iv + ciphertext as base64
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return btoa(String.fromCharCode(...combined))
}

async function decrypt(ciphertextB64: string): Promise<string> {
  const key = await getOrCreateKey()
  const combined = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(decrypted)
}

// ─── Public API ───

const ENCRYPTED_PREFIX = '__fw_enc__'

/**
 * Securely store a value in localStorage (encrypted with AES-256-GCM).
 * Falls back to plain localStorage if Web Crypto is unavailable.
 */
export async function secureSet(key: string, value: unknown): Promise<void> {
  const serialized = JSON.stringify(value)
  
  if (typeof crypto?.subtle?.encrypt === 'function') {
    try {
      const encrypted = await encrypt(serialized)
      localStorage.setItem(key, ENCRYPTED_PREFIX + encrypted)
      return
    } catch {
      // Fallback below
    }
  }
  
  // Fallback: plain storage
  localStorage.setItem(key, serialized)
}

/**
 * Read and decrypt a value from localStorage.
 * Returns null if key doesn't exist or decryption fails.
 */
export async function secureGet<T = unknown>(key: string): Promise<T | null> {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  
  if (raw.startsWith(ENCRYPTED_PREFIX)) {
    try {
      const decrypted = await decrypt(raw.slice(ENCRYPTED_PREFIX.length))
      return JSON.parse(decrypted) as T
    } catch {
      // Corrupted or key rotated — remove and return null
      localStorage.removeItem(key)
      return null
    }
  }
  
  // Legacy plain value — migrate to encrypted
  try {
    const parsed = JSON.parse(raw) as T
    await secureSet(key, parsed) // Re-store encrypted
    return parsed
  } catch {
    return null
  }
}

/**
 * Remove a secure value from localStorage.
 */
export function secureRemove(key: string): void {
  localStorage.removeItem(key)
}

/**
 * Check if Web Crypto API is available for encryption.
 */
export function isSecureStorageAvailable(): boolean {
  return typeof crypto?.subtle?.encrypt === 'function'
}
