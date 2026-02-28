'use client'

import { useCallback, useEffect, useRef } from 'react'
import Map, { Marker, Popup } from 'react-map-gl/maplibre'
import type { MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEventStore } from '@/stores/event-store'
import { useMapStore } from '@/stores/map-store'
import { MarkerDot } from './marker-dot'
import { MarkerPopup } from './marker-popup'

const STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

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

  const geoEvents = events.filter((e) => e.location)

  return (
    <div className="relative w-full h-full">
    <Map
      ref={mapRef}
      initialViewState={viewport}
      onMove={onMove}
      mapStyle={STYLE}
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
    <div className="absolute bottom-3 right-3 bg-[var(--bg-secondary)]/90 border border-[var(--border)] rounded-lg px-3 py-2 text-[10px] flex flex-col gap-1">
      {([
        ['var(--accent-red)', 'Critical'],
        ['var(--accent-orange)', 'High'],
        ['var(--accent-yellow)', 'Medium'],
        ['var(--accent-blue)', 'Low'],
        ['var(--accent-green)', 'Info'],
      ] as const).map(([color, label]) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full border border-black/30" style={{ background: color }} />
          <span className="text-[var(--text-secondary)]">{label}</span>
        </div>
      ))}
    </div>
    </div>
  )
}
