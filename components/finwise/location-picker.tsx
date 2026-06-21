'use client'

import { useState } from 'react'
import { MapPin, Navigation, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Types ───
export interface LocationData {
  name: string
  lat?: number
  lng?: number
  address?: string
}

// ─── Location Picker Component ───
export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationData | null
  onChange: (loc: LocationData | null) => void
}) {
  const [gettingLocation, setGettingLocation] = useState(false)
  const [manualName, setManualName] = useState(value?.name || '')
  const [showManual, setShowManual] = useState(false)

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Browser kamu tidak mendukung geolokasi')
      return
    }

    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        // Try reverse geocoding
        let address = ''
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`
          )
          const data = await res.json()
          address = data.display_name || ''
        } catch {}

        onChange({
          name: address ? address.split(',').slice(0, 3).join(',').trim() : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          lat: latitude,
          lng: longitude,
          address,
        })
        setGettingLocation(false)
      },
      (err) => {
        console.error('Geolocation error:', err)
        setGettingLocation(false)
        alert('Gagal mendapatkan lokasi. Pastikan GPS aktif.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    )
  }

  function setManualLocation() {
    if (!manualName.trim()) return
    onChange({ name: manualName.trim() })
    setShowManual(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="flex items-center gap-1.5">
        <MapPin className="size-3.5" /> Lokasi <span className="text-xs text-muted-foreground">(opsional)</span>
      </Label>

      {value ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2.5">
          <MapPin className="size-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{value.name}</p>
            {value.lat && value.lng && (
              <p className="text-[10px] text-muted-foreground">
                {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-destructive hover:underline"
          >
            Hapus
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className="flex-1 gap-1.5"
            >
              {gettingLocation ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Navigation className="size-3.5" />
              )}
              {gettingLocation ? 'Mendeteksi...' : 'Lokasi Saat Ini'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowManual(!showManual)}
              className="flex-1 gap-1.5"
            >
              <Globe className="size-3.5" /> Ketik Manual
            </Button>
          </div>

          {showManual && (
            <div className="flex gap-2">
              <Input
                placeholder="Nama tempat (misal: Mall Senayan City)"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setManualLocation()}
                className="text-sm"
              />
              <Button type="button" size="sm" onClick={setManualLocation}>
                OK
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Location Display (for transaction rows) ───
export function LocationBadge({ location }: { location: LocationData }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0 text-[10px] text-blue-600 dark:text-blue-400">
      <MapPin className="size-2.5" />
      {location.name.length > 20 ? location.name.slice(0, 20) + '...' : location.name}
    </span>
  )
}
