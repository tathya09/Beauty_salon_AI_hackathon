'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import Link from 'next/link'
import { useDiscoveryStore } from '@/store/discoveryStore'
import type { Salon } from '@/types'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons for Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const pinkIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})

function MapUpdater({ salons }: { salons: Salon[] }) {
  const map = useMap()
  useEffect(() => {
    if (salons.length > 0) {
      const bounds = L.latLngBounds(salons.map((s) => [s.coordinates.latitude, s.coordinates.longitude]))
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [salons, map])
  return null
}

export function SalonMap({ salons }: { salons: Salon[] }) {
  const { setActiveSalonId, activeSalonId } = useDiscoveryStore()

  return (
    <MapContainer
      center={[19.076, 72.8777]}
      zoom={12}
      className="w-full h-full rounded-xl"
      style={{ minHeight: '400px' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <MapUpdater salons={salons} />
      {salons.map((salon) => (
        <Marker
          key={salon.id}
          position={[salon.coordinates.latitude, salon.coordinates.longitude]}
          icon={salon.id === activeSalonId ? pinkIcon : new L.Icon.Default()}
          eventHandlers={{ click: () => setActiveSalonId(salon.id) }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{salon.name}</p>
              <p className="text-gray-500 text-xs">{salon.area}</p>
              <p className="text-amber-500 text-xs">⭐ {salon.rating}</p>
              <Link href={`/salons/${salon.id}`} className="text-rose-500 text-xs underline">
                View salon →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
