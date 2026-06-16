'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet'
import L from 'leaflet'
import Link from 'next/link'
import { useDiscoveryStore } from '@/store/discoveryStore'
import { haversineKm, formatDistance } from '@/utils/geo'
import type { Salon } from '@/types'
import 'leaflet/dist/leaflet.css'

// ── Icon setup ────────────────────────────────────────────────
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const roseIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})

const goldIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [30, 49], iconAnchor: [15, 49], popupAnchor: [1, -40], shadowSize: [41, 41],
})

// Pulsing user location dot using DivIcon
function makeUserIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:24px;height:24px">
        <div style="position:absolute;inset:0;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.5);z-index:2"></div>
        <div style="position:absolute;inset:-6px;background:rgba(59,130,246,0.2);border-radius:50%;animation:pulse 2s infinite;z-index:1"></div>
      </div>
      <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(1.4);opacity:0}}</style>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

// ── Map controller — flies to user or fits salon bounds ──────
function MapController({ salons, userLocation }: {
  salons: Salon[]
  userLocation: { latitude: number; longitude: number } | null
}) {
  const map = useMap()
  const prevUserLoc = useRef<string>('')

  useEffect(() => {
    const key = userLocation ? `${userLocation.latitude},${userLocation.longitude}` : ''
    if (userLocation && key !== prevUserLoc.current) {
      prevUserLoc.current = key
      map.flyTo([userLocation.latitude, userLocation.longitude], 14, { duration: 1.5 })
    } else if (!userLocation && salons.length > 0) {
      const bounds = L.latLngBounds(
        salons.map((s) => [s.coordinates.latitude, s.coordinates.longitude])
      )
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [userLocation, salons, map])

  return null
}

// ── Main component ────────────────────────────────────────────
export function SalonMap({ salons }: { salons: Salon[] }) {
  const { setActiveSalonId, activeSalonId, userLocation } = useDiscoveryStore()

  // Find nearest salon to user
  const nearestId = userLocation && salons.length > 0
    ? salons.reduce((nearest, salon) => {
        const d = haversineKm(
          userLocation.latitude, userLocation.longitude,
          salon.coordinates.latitude, salon.coordinates.longitude
        )
        const nd = haversineKm(
          userLocation.latitude, userLocation.longitude,
          nearest.coordinates.latitude, nearest.coordinates.longitude
        )
        return d < nd ? salon : nearest
      }).id
    : null

  return (
    <MapContainer
      center={[19.076, 72.8777]}
      zoom={12}
      className="w-full h-full rounded-xl"
      style={{ minHeight: '400px' }}
    >
      {/* OpenStreetMap tiles */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <MapController salons={salons} userLocation={userLocation} />

      {/* User location marker + accuracy circle */}
      {userLocation && (
        <>
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={makeUserIcon()}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="text-sm text-center">
                <p className="font-semibold text-blue-600">📍 You are here</p>
                {nearestId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Nearest salon: {salons.find((s) => s.id === nearestId)?.name}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
          {/* 2 km radius ring */}
          <Circle
            center={[userLocation.latitude, userLocation.longitude]}
            radius={2000}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.05, weight: 1.5, dashArray: '6 4' }}
          />
        </>
      )}

      {/* Salon markers */}
      {salons.map((salon) => {
        const isActive = salon.id === activeSalonId
        const isNearest = salon.id === nearestId
        const dist = userLocation
          ? haversineKm(
              userLocation.latitude, userLocation.longitude,
              salon.coordinates.latitude, salon.coordinates.longitude
            )
          : null

        return (
          <Marker
            key={salon.id}
            position={[salon.coordinates.latitude, salon.coordinates.longitude]}
            icon={isNearest ? goldIcon : isActive ? roseIcon : new L.Icon.Default()}
            zIndexOffset={isNearest ? 500 : isActive ? 200 : 0}
            eventHandlers={{ click: () => setActiveSalonId(salon.id) }}
          >
            <Popup>
              <div className="text-sm min-w-[160px]">
                {isNearest && (
                  <div className="bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-1 rounded mb-2 text-center">
                    🏆 Nearest to you
                  </div>
                )}
                <p className="font-semibold text-gray-900">{salon.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">{salon.area}</p>
                <div className="flex items-center gap-2 mt-1.5 text-xs">
                  <span className="text-amber-500">⭐ {salon.rating.toFixed(1)}</span>
                  <span className="text-gray-400">({salon.reviewCount} reviews)</span>
                </div>
                {dist !== null && (
                  <div className="mt-1.5 text-xs text-blue-600 font-medium">
                    📍 {formatDistance(dist)} from you
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <Link
                    href={`/salons/${salon.id}`}
                    className="flex-1 text-center text-xs bg-rose-500 text-white px-2 py-1.5 rounded-lg font-medium hover:bg-rose-600"
                  >
                    View salon
                  </Link>
                  <Link
                    href={`/salons/${salon.id}/book`}
                    className="flex-1 text-center text-xs border border-rose-300 text-rose-600 px-2 py-1.5 rounded-lg font-medium hover:bg-rose-50"
                  >
                    Book
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
