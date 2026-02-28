'use client'

import { useCallback, useEffect, useRef } from 'react'
import Map, { Marker, Popup } from 'react-map-gl'
import type { MapRef } from 'react-map-gl'
import { useEventStore } from '@/stores/event-store'
import { useMapStore } from '@/stores/map-store'
import { MarkerDot } from './marker-dot'
import { MarkerPopup } from './marker-popup'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export function CrisisMap() {
  const mapRef = useRef<MapRef>(null)
  const events = useEventStore((s) => s.events)
  const selectedId = useEventStore((s) => s.selectedEventId)
  const select = useEventStore((s) => s.setSelectedEvent)
  const viewport = useMapStore((s) => s.viewport)
  const setViewport = useMapStore((s) => s.setViewport)

  const selectedEvent = events.find((e) => e.id === selectedId)

  const prevViewport = useRef(viewport)
  useEffect(() => {
    if (viewport !== prevViewport.current) {
      prevViewport.current = viewport
      mapRef.current?.flyTo({
        center: [viewport.longitude, viewport.latitude],
        zoom: viewport.zoom,
        duration: 1500,
      })
    }
  }, [viewport])

  const onMove = useCallback(
    (evt: { viewState: { latitude: number; longitude: number; zoom: number } }) => {
      setViewport(evt.viewState)
    },
    [setViewport],
  )

  if (!TOKEN) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-secondary)] text-sm">
        Set MAPBOX_TOKEN to enable map
      </div>
    )
  }

  const geoEvents = events.filter((e) => e.location)

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={TOKEN}
      initialViewState={viewport}
      onMove={onMove}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
    >
      {geoEvents.map((e) => (
        <Marker
          key={e.id}
          latitude={e.location!.lat}
          longitude={e.location!.lng}
          anchor="center"
        >
          <MarkerDot event={e} onClick={() => select(e.id)} />
        </Marker>
      ))}

      {selectedEvent?.location && (
        <Popup
          latitude={selectedEvent.location.lat}
          longitude={selectedEvent.location.lng}
          onClose={() => select(null)}
          closeOnClick={false}
          anchor="bottom"
          offset={12}
        >
          <MarkerPopup event={selectedEvent} />
        </Popup>
      )}
    </Map>
  )
}
