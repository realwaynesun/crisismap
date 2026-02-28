import { create } from 'zustand'

interface Viewport {
  latitude: number
  longitude: number
  zoom: number
}

interface MapState {
  viewport: Viewport
  setViewport: (vp: Viewport) => void
  flyTo: (lat: number, lng: number, zoom?: number) => void
}

export const useMapStore = create<MapState>((set) => ({
  viewport: { latitude: 32, longitude: 50, zoom: 4 },

  setViewport: (viewport) => set({ viewport }),

  flyTo: (latitude, longitude, zoom = 6) =>
    set({ viewport: { latitude, longitude, zoom } }),
}))
