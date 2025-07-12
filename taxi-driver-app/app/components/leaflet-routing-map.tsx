"use client"

import { useEffect, useRef } from "react"

interface LeafletRoutingMapProps {
  pickupCoords: [number, number]
  dropoffCoords: [number, number]
  pickupAddress: string
  dropoffAddress: string
}

export default function LeafletRoutingMap({
  pickupCoords,
  dropoffCoords,
  pickupAddress,
  dropoffAddress,
}: LeafletRoutingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return

    // Load Leaflet from CDN
    const loadLeaflet = async () => {
      // Add Leaflet CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        link.crossOrigin = ""
        document.head.appendChild(link)
      }

      // Load Leaflet JS
      if (!(window as any).L) {
        const script = document.createElement("script")
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        script.crossOrigin = ""

        return new Promise((resolve, reject) => {
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
      }
    }

    loadLeaflet()
      .then(() => {
        const L = (window as any).L

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove()
        }

        // Fix for default markers
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        })

        // Create custom icons
        const pickupIcon = L.divIcon({
          html: `
            <div style="
              width: 32px; 
              height: 32px; 
              background: #10B981; 
              border: 3px solid white; 
              border-radius: 50%; 
              box-shadow: 0 3px 10px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              color: white;
              font-size: 14px;
              font-family: system-ui;
            ">P</div>
          `,
          className: "custom-pickup-icon",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })

        const dropoffIcon = L.divIcon({
          html: `
            <div style="
              width: 32px; 
              height: 32px; 
              background: #EF4444; 
              border: 3px solid white; 
              border-radius: 50%; 
              box-shadow: 0 3px 10px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              color: white;
              font-size: 14px;
              font-family: system-ui;
            ">D</div>
          `,
          className: "custom-dropoff-icon",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })

        // Initialize map
        const map = L.map(mapRef.current, {
          zoomControl: true,
          attributionControl: true,
        }).setView(pickupCoords, 13)

        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map)

        // Add markers
        const pickupMarker = L.marker(pickupCoords, { icon: pickupIcon }).addTo(map)
        pickupMarker.bindPopup(`
          <div style="font-family: system-ui; padding: 5px;">
            <strong style="color: #10B981;">📍 Pickup Location</strong><br>
            <span style="color: #666; font-size: 13px;">${pickupAddress}</span>
          </div>
        `)

        const dropoffMarker = L.marker(dropoffCoords, { icon: dropoffIcon }).addTo(map)
        dropoffMarker.bindPopup(`
          <div style="font-family: system-ui; padding: 5px;">
            <strong style="color: #EF4444;">🎯 Dropoff Location</strong><br>
            <span style="color: #666; font-size: 13px;">${dropoffAddress}</span>
          </div>
        `)

        // Create route line
        const routeLine = L.polyline([pickupCoords, dropoffCoords], {
          color: "#3B82F6",
          weight: 6,
          opacity: 0.7,
          dashArray: "15, 10",
        }).addTo(map)

        // Add a solid route line on top
        const solidRoute = L.polyline([pickupCoords, dropoffCoords], {
          color: "#1E40AF",
          weight: 4,
          opacity: 0.9,
        }).addTo(map)

        // Calculate distance
        const distance = calculateDistance(pickupCoords, dropoffCoords)
        const estimatedTime = Math.round(distance * 2.5) // Rough estimate

        // Add route info control
        const RouteInfo = L.Control.extend({
          onAdd: () => {
            const div = L.DomUtil.create("div", "route-info-control")
            div.innerHTML = `
              <div style="
                background: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                font-family: system-ui;
                min-width: 200px;
              ">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">🗺️ Route Info</h3>
                <div style="margin: 5px 0; font-size: 14px; color: #666;">
                  <strong>Distance:</strong> ${distance.toFixed(1)} km
                </div>
                <div style="margin: 5px 0; font-size: 14px; color: #666;">
                  <strong>Est. Time:</strong> ${estimatedTime} min
                </div>
                <div style="margin: 10px 0 5px 0; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                  📍 Start at pickup → 🎯 Drive to dropoff
                </div>
              </div>
            `
            return div
          },
          onRemove: () => {
            // Nothing to do here
          },
        })

        const routeInfo = new RouteInfo({ position: "topleft" })
        routeInfo.addTo(map)

        // Fit map to show both markers
        const group = new L.FeatureGroup([pickupMarker, dropoffMarker])
        map.fitBounds(group.getBounds().pad(0.1))

        mapInstanceRef.current = map

        // Try to fetch detailed route
        fetchDetailedRoute(pickupCoords, dropoffCoords)
          .then((routeData) => {
            if (routeData && routeData.coordinates && routeData.coordinates.length > 2) {
              // Remove simple lines
              map.removeLayer(routeLine)
              map.removeLayer(solidRoute)

              // Add detailed route
              const detailedRoute = L.polyline(routeData.coordinates, {
                color: "#1E40AF",
                weight: 5,
                opacity: 0.8,
              }).addTo(map)

              // Update route info
              const updatedInfo = `
                <div style="
                  background: white;
                  padding: 15px;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  font-family: system-ui;
                  min-width: 200px;
                ">
                  <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">🗺️ Route Info</h3>
                  <div style="margin: 5px 0; font-size: 14px; color: #666;">
                    <strong>Distance:</strong> ${(routeData.distance / 1000).toFixed(1)} km
                  </div>
                  <div style="margin: 5px 0; font-size: 14px; color: #666;">
                    <strong>Est. Time:</strong> ${Math.round(routeData.duration / 60)} min
                  </div>
                  <div style="margin: 10px 0 5px 0; padding: 8px; background: #e3f2fd; border-radius: 4px; font-size: 12px;">
                    ✅ Optimized route loaded
                  </div>
                </div>
              `
              routeInfo.getContainer().innerHTML = updatedInfo
            }
          })
          .catch(() => {
            console.log("Using simple route display")
          })
      })
      .catch((error) => {
        console.error("Failed to load Leaflet:", error)
        // Fallback display
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div style="
              height: 100%; 
              display: flex; 
              flex-direction: column; 
              justify-content: center; 
              align-items: center; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
              padding: 20px;
              font-family: system-ui;
            ">
              <div style="font-size: 64px; margin-bottom: 20px;">🗺️</div>
              <div style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">Route Planned</div>
              <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin: 10px 0;">
                <div style="font-size: 16px; margin-bottom: 8px;">📍 <strong>From:</strong></div>
                <div style="font-size: 14px; margin-bottom: 15px;">${pickupAddress}</div>
                <div style="font-size: 16px; margin-bottom: 8px;">🎯 <strong>To:</strong></div>
                <div style="font-size: 14px;">${dropoffAddress}</div>
              </div>
              <div style="margin-top: 20px; font-size: 14px; opacity: 0.8;">
                Map will load when connection is available
              </div>
            </div>
          `
        }
      })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [pickupCoords, dropoffCoords, pickupAddress, dropoffAddress])

  return <div ref={mapRef} className="w-full h-full bg-gray-100" />
}

// Helper function to calculate distance
function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = deg2rad(coord2[0] - coord1[0])
  const dLon = deg2rad(coord2[1] - coord1[1])
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(coord1[0])) * Math.cos(deg2rad(coord2[0])) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Function to fetch detailed route
async function fetchDetailedRoute(start: [number, number], end: [number, number]) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error("Route fetch failed")
    }

    const data = await response.json()

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0]
      return {
        coordinates: route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]),
        distance: route.distance,
        duration: route.duration,
      }
    }
    return null
  } catch (error) {
    console.error("Error fetching route:", error)
    return null
  }
}
