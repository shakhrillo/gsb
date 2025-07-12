"use client"

import { useEffect, useRef, useState } from "react"
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InteractiveMapProps {
  driverLocation: [number, number]
  pickupCoords: [number, number]
  dropoffCoords: [number, number]
  progress: number
}

export default function InteractiveMap({ driverLocation, pickupCoords, dropoffCoords, progress }: InteractiveMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })

  // Handle mouse events for pan and zoom
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true)
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const deltaX = e.clientX - lastMousePos.x
      const deltaY = e.clientY - lastMousePos.y

      setPan((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }))

      setLastMousePos({ x: e.clientX, y: e.clientY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      setZoom((prev) => Math.max(0.5, Math.min(3, prev * zoomFactor)))
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("wheel", handleWheel)

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("wheel", handleWheel)
    }
  }, [isDragging, lastMousePos])

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

    // Apply zoom and pan transformations
    ctx.save()
    ctx.translate(pan.x + rect.width / 2, pan.y + rect.height / 2)
    ctx.scale(zoom, zoom)
    ctx.translate(-rect.width / 2, -rect.height / 2)

    // Calculate bounds and scale
    const allLats = [driverLocation[0], pickupCoords[0], dropoffCoords[0]]
    const allLngs = [driverLocation[1], pickupCoords[1], dropoffCoords[1]]

    const minLat = Math.min(...allLats) - 0.01
    const maxLat = Math.max(...allLats) + 0.01
    const minLng = Math.min(...allLngs) - 0.01
    const maxLng = Math.max(...allLngs) + 0.01

    const padding = 50
    const mapWidth = rect.width - padding * 2
    const mapHeight = rect.height - padding * 2

    // Convert lat/lng to canvas coordinates
    const latToY = (lat: number) => padding + ((maxLat - lat) / (maxLat - minLat)) * mapHeight
    const lngToX = (lng: number) => padding + ((lng - minLng) / (maxLng - minLng)) * mapWidth

    // Draw map background with street-like pattern
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Draw street grid
    ctx.strokeStyle = "#e2e8f0"
    ctx.lineWidth = 1

    // Vertical streets
    for (let i = 0; i <= 20; i++) {
      const x = padding + (i / 20) * mapWidth
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, padding + mapHeight)
      ctx.stroke()
    }

    // Horizontal streets
    for (let i = 0; i <= 15; i++) {
      const y = padding + (i / 15) * mapHeight
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + mapWidth, y)
      ctx.stroke()
    }

    // Draw main roads (thicker lines)
    ctx.strokeStyle = "#cbd5e1"
    ctx.lineWidth = 2

    // Main vertical roads
    for (let i = 0; i <= 4; i++) {
      const x = padding + (i / 4) * mapWidth
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, padding + mapHeight)
      ctx.stroke()
    }

    // Main horizontal roads
    for (let i = 0; i <= 3; i++) {
      const y = padding + (i / 3) * mapHeight
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + mapWidth, y)
      ctx.stroke()
    }

    // Add some building blocks
    ctx.fillStyle = "#f1f5f9"
    ctx.strokeStyle = "#e2e8f0"
    ctx.lineWidth = 1

    for (let i = 0; i < 30; i++) {
      const x = padding + Math.random() * mapWidth
      const y = padding + Math.random() * mapHeight
      const width = 20 + Math.random() * 40
      const height = 15 + Math.random() * 30

      ctx.fillRect(x, y, width, height)
      ctx.strokeRect(x, y, width, height)
    }

    // Calculate positions
    const pickupX = lngToX(pickupCoords[1])
    const pickupY = latToY(pickupCoords[0])
    const dropoffX = lngToX(dropoffCoords[1])
    const dropoffY = latToY(dropoffCoords[0])
    const driverX = lngToX(driverLocation[1])
    const driverY = latToY(driverLocation[0])

    // Draw route path (dashed line)
    ctx.strokeStyle = "#3b82f6"
    ctx.lineWidth = 4
    ctx.setLineDash([15, 10])
    ctx.beginPath()
    ctx.moveTo(pickupX, pickupY)
    ctx.lineTo(dropoffX, dropoffY)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw completed route (solid line)
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
    ctx.strokeStyle = "white"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(pickupX, pickupY, 15, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()

    // Pickup icon
    ctx.fillStyle = "white"
    ctx.beginPath()
    ctx.arc(pickupX, pickupY, 7, 0, 2 * Math.PI)
    ctx.fill()

    // Draw dropoff marker
    ctx.fillStyle = "#ef4444"
    ctx.strokeStyle = "white"
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(dropoffX, dropoffY, 15, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()

    // Dropoff icon
    ctx.fillStyle = "white"
    ctx.beginPath()
    ctx.arc(dropoffX, dropoffY, 7, 0, 2 * Math.PI)
    ctx.fill()

    // Draw driver marker (animated)
    const pulseSize = 5 + Math.sin(Date.now() / 500) * 3
    ctx.fillStyle = "#3b82f6"
    ctx.strokeStyle = "white"
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(driverX, driverY, 18 + pulseSize, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()

    // Driver icon
    ctx.fillStyle = "white"
    ctx.beginPath()
    ctx.arc(driverX, driverY, 10, 0, 2 * Math.PI)
    ctx.fill()

    // Draw labels
    ctx.fillStyle = "#374151"
    ctx.font = "bold 14px system-ui"
    ctx.textAlign = "center"
    ctx.strokeStyle = "white"
    ctx.lineWidth = 3

    // Pickup label
    ctx.strokeText("PICKUP", pickupX, pickupY - 25)
    ctx.fillText("PICKUP", pickupX, pickupY - 25)

    // Dropoff label
    ctx.strokeText("DROPOFF", dropoffX, dropoffY - 25)
    ctx.fillText("DROPOFF", dropoffX, dropoffY - 25)

    // Driver label
    ctx.strokeText("YOU", driverX, driverY - 35)
    ctx.fillText("YOU", driverX, driverY - 35)

    ctx.restore()
  }, [driverLocation, pickupCoords, dropoffCoords, progress, zoom, pan])

  const handleZoomIn = () => setZoom((prev) => Math.min(3, prev * 1.2))
  const handleZoomOut = () => setZoom((prev) => Math.max(0.5, prev / 1.2))
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gray-100 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Map controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Button size="sm" variant="secondary" onClick={handleZoomIn} className="w-10 h-10 p-0">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="secondary" onClick={handleZoomOut} className="w-10 h-10 p-0">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="secondary" onClick={handleReset} className="w-10 h-10 p-0">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3">
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
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
        <div className="text-sm font-medium text-gray-700">Trip Progress</div>
        <div className="text-2xl font-bold text-blue-600">{Math.round(progress)}%</div>
        <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3">
        <div className="text-sm font-medium text-gray-700">Status</div>
        <div className="text-lg font-bold text-green-600">
          {progress < 10 ? "Starting" : progress < 90 ? "En Route" : "Arriving"}
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm opacity-50">
          Drag to pan • Scroll to zoom
        </div>
      </div>
    </div>
  )
}
