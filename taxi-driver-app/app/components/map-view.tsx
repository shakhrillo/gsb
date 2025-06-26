"use client"

import { useEffect, useRef } from "react"

interface MapViewProps {
  driverLocation: [number, number]
  pickupCoords: [number, number]
  dropoffCoords: [number, number]
  progress: number
}

export default function MapView({ driverLocation, pickupCoords, dropoffCoords, progress }: MapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Calculate bounds and scale
    const allLats = [driverLocation[0], pickupCoords[0], dropoffCoords[0]]
    const allLngs = [driverLocation[1], pickupCoords[1], dropoffCoords[1]]

    const minLat = Math.min(...allLats)
    const maxLat = Math.max(...allLats)
    const minLng = Math.min(...allLngs)
    const maxLng = Math.max(...allLngs)

    const padding = 50
    const mapWidth = rect.width - padding * 2
    const mapHeight = rect.height - padding * 2

    // Convert lat/lng to canvas coordinates
    const latToY = (lat: number) => padding + ((maxLat - lat) / (maxLat - minLat)) * mapHeight
    const lngToX = (lng: number) => padding + ((lng - minLng) / (maxLng - minLng)) * mapWidth

    // Draw background
    ctx.fillStyle = "#f3f4f6"
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Draw grid lines
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i / 10) * mapWidth
      const y = padding + (i / 10) * mapHeight

      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, padding + mapHeight)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + mapWidth, y)
      ctx.stroke()
    }

    // Draw route line
    const pickupX = lngToX(pickupCoords[1])
    const pickupY = latToY(pickupCoords[0])
    const dropoffX = lngToX(dropoffCoords[1])
    const dropoffY = latToY(dropoffCoords[0])
    const driverX = lngToX(driverLocation[1])
    const driverY = latToY(driverLocation[0])

    // Draw route path
    ctx.strokeStyle = "#3b82f6"
    ctx.lineWidth = 4
    ctx.setLineDash([10, 10])
    ctx.beginPath()
    ctx.moveTo(pickupX, pickupY)
    ctx.lineTo(dropoffX, dropoffY)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw completed route
    if (progress > 0) {
      const completedX = pickupX + (dropoffX - pickupX) * (progress / 100)
      const completedY = pickupY + (dropoffY - pickupY) * (progress / 100)

      ctx.strokeStyle = "#10b981"
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(pickupX, pickupY)
      ctx.lineTo(completedX, completedY)
      ctx.stroke()
    }

    // Draw pickup marker
    ctx.fillStyle = "#10b981"
    ctx.beginPath()
    ctx.arc(pickupX, pickupY, 12, 0, 2 * Math.PI)
    ctx.fill()
    ctx.fillStyle = "white"
    ctx.beginPath()
    ctx.arc(pickupX, pickupY, 6, 0, 2 * Math.PI)
    ctx.fill()

    // Draw dropoff marker
    ctx.fillStyle = "#ef4444"
    ctx.beginPath()
    ctx.arc(dropoffX, dropoffY, 12, 0, 2 * Math.PI)
    ctx.fill()
    ctx.fillStyle = "white"
    ctx.beginPath()
    ctx.arc(dropoffX, dropoffY, 6, 0, 2 * Math.PI)
    ctx.fill()

    // Draw driver marker
    ctx.fillStyle = "#3b82f6"
    ctx.beginPath()
    ctx.arc(driverX, driverY, 15, 0, 2 * Math.PI)
    ctx.fill()
    ctx.fillStyle = "white"
    ctx.beginPath()
    ctx.arc(driverX, driverY, 8, 0, 2 * Math.PI)
    ctx.fill()

    // Draw labels
    ctx.fillStyle = "#374151"
    ctx.font = "12px system-ui"
    ctx.textAlign = "center"

    ctx.fillText("Pickup", pickupX, pickupY - 20)
    ctx.fillText("Dropoff", dropoffX, dropoffY - 20)
    ctx.fillText("You", driverX, driverY - 25)
  }, [driverLocation, pickupCoords, dropoffCoords, progress])

  return (
    <div className="relative w-full h-full bg-gray-100">
      <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Your Location</span>
        </div>
        <div className="flex items-center gap-2 text-sm mt-1">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Pickup</span>
        </div>
        <div className="flex items-center gap-2 text-sm mt-1">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>Dropoff</span>
        </div>
      </div>
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-3">
        <div className="text-sm font-medium">Progress</div>
        <div className="text-lg font-bold text-blue-600">{progress}%</div>
      </div>
    </div>
  )
}
