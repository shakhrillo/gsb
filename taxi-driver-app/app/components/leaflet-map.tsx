"use client"

import { useEffect, useRef } from "react"

interface LeafletMapProps {
  driverLocation: [number, number]
  pickupCoords: [number, number]
  dropoffCoords: [number, number]
  progress: number
}

export default function LeafletMap({ driverLocation, pickupCoords, dropoffCoords, progress }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const routeLineRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Dynamically import Leaflet
    import("leaflet").then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return

      // Fix for default markers
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      })

      // Create custom icons
      const driverIcon = L.divIcon({
        html: `
          <div style="
            width: 20px; 
            height: 20px; 
            background: #3B82F6; 
            border: 3px solid white; 
            border-radius: 50%; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        `,
        className: "custom-div-icon",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })

      const pickupIcon = L.divIcon({
        html: `
          <div style="
            width: 16px; 
            height: 16px; 
            background: #10B981; 
            border: 2px solid white; 
            border-radius: 50%; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        `,
        className: "custom-div-icon",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })

      const dropoffIcon = L.divIcon({
        html: `
          <div style="
            width: 16px; 
            height: 16px; 
            background: #EF4444; 
            border: 2px solid white; 
            border-radius: 50%; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        `,
        className: "custom-div-icon",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })

      // Initialize map
      const map = L.map(mapRef.current).setView(driverLocation, 13)

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)

      // Add markers
      const driverMarker = L.marker(driverLocation, { icon: driverIcon }).addTo(map)
      driverMarker.bindPopup("Your Location")

      const pickupMarker = L.marker(pickupCoords, { icon: pickupIcon }).addTo(map)
      pickupMarker.bindPopup("Pickup Location")

      const dropoffMarker = L.marker(dropoffCoords, { icon: dropoffIcon }).addTo(map)
      dropoffMarker.bindPopup("Dropoff Location")

      // Create route line
      const routeLine = L.polyline([pickupCoords, dropoffCoords], {
        color: "#3B82F6",
        weight: 4,
        opacity: 0.7,
        dashArray: "10, 10",
      }).addTo(map)

      // Create completed route line
      const completedLine = L.polyline([], {
        color: "#10B981",
        weight: 6,
        opacity: 0.8,
      }).addTo(map)

      // Fit map to show all markers
      const group = new L.FeatureGroup([driverMarker, pickupMarker, dropoffMarker])
      map.fitBounds(group.getBounds().pad(0.1))

      // Store references
      mapInstanceRef.current = map
      markersRef.current = [driverMarker, pickupMarker, dropoffMarker]
      routeLineRef.current = { routeLine, completedLine }
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update driver location and progress
  useEffect(() => {
    if (!mapInstanceRef.current || !markersRef.current[0] || !routeLineRef.current) return

    import("leaflet").then((L) => {
      const [driverMarker] = markersRef.current
      const { completedLine } = routeLineRef.current

      // Update driver marker position
      driverMarker.setLatLng(driverLocation)

      // Update completed route based on progress
      if (progress > 0) {
        const startLat = pickupCoords[0]
        const startLng = pickupCoords[1]
        const endLat = dropoffCoords[0]
        const endLng = dropoffCoords[1]

        const currentLat = startLat + (endLat - startLat) * (progress / 100)
        const currentLng = startLng + (endLng - startLng) * (progress / 100)

        completedLine.setLatLngs([pickupCoords, [currentLat, currentLng]])
      }

      // Center map on driver location
      mapInstanceRef.current.panTo(driverLocation)
    })
  }, [driverLocation, progress, pickupCoords, dropoffCoords])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full z-0" />

      {/* Map controls overlay */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
        <div className="flex items-center gap-2 text-sm mb-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
          <span className="font-medium">Your Location</span>
        </div>
        <div className="flex items-center gap-2 text-sm mb-2">
          <div className="w-3 h-3 bg-green-500 rounded-full border border-white"></div>
          <span>Pickup Point</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 bg-red-500 rounded-full border border-white"></div>
          <span>Dropoff Point</span>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-10">
        <div className="text-sm font-medium text-gray-700">Trip Progress</div>
        <div className="text-2xl font-bold text-blue-600">{Math.round(progress)}%</div>
        <div className="w-20 bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Speed/Status indicator */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
        <div className="text-sm font-medium text-gray-700">Status</div>
        <div className="text-lg font-bold text-green-600">
          {progress < 10 ? "Starting Trip" : progress < 90 ? "En Route" : "Arriving Soon"}
        </div>
      </div>
    </div>
  )
}
