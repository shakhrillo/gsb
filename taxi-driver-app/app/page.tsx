"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, User, Phone, Navigation, CheckCircle } from "lucide-react"
import dynamic from "next/dynamic"

// Dynamically import the map component to avoid SSR issues
const LeafletMapWithRouting = dynamic(() => import("./components/leaflet-routing-map"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-200 flex items-center justify-center">Loading map...</div>,
})

interface Order {
  id: string
  customerName: string
  customerPhone: string
  pickupAddress: string
  dropoffAddress: string
  pickupCoords: [number, number]
  dropoffCoords: [number, number]
  fare: number
  distance: string
  estimatedTime: string
  status: "pending" | "accepted" | "completed"
}

const mockOrders: Order[] = [
  {
    id: "1",
    customerName: "John Smith",
    customerPhone: "+1 234-567-8901",
    pickupAddress: "123 Main St, Downtown",
    dropoffAddress: "456 Oak Ave, Uptown",
    pickupCoords: [40.7128, -74.006],
    dropoffCoords: [40.7589, -73.9851],
    fare: 15.5,
    distance: "3.2 km",
    estimatedTime: "12 min",
    status: "pending",
  },
  {
    id: "2",
    customerName: "Sarah Johnson",
    customerPhone: "+1 234-567-8902",
    pickupAddress: "789 Pine St, Midtown",
    dropoffAddress: "321 Elm St, Westside",
    pickupCoords: [40.7505, -73.9934],
    dropoffCoords: [40.7282, -74.0776],
    fare: 22.75,
    distance: "5.1 km",
    estimatedTime: "18 min",
    status: "pending",
  },
  {
    id: "3",
    customerName: "Mike Davis",
    customerPhone: "+1 234-567-8903",
    pickupAddress: "555 Broadway, Theater District",
    dropoffAddress: "888 Park Ave, Upper East",
    pickupCoords: [40.759, -73.9845],
    dropoffCoords: [40.7736, -73.9566],
    fare: 18.25,
    distance: "2.8 km",
    estimatedTime: "15 min",
    status: "pending",
  },
]

export default function TaxiDriverApp() {
  const [orders, setOrders] = useState<Order[]>(mockOrders)
  const [currentView, setCurrentView] = useState<"orders" | "driving" | "success">("orders")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)

  const handleAcceptOrder = (order: Order) => {
    setActiveOrder(order)
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "accepted" } : o)))
    setCurrentView("driving")
  }

  const handleCompleteOrder = () => {
    if (activeOrder) {
      setOrders((prev) => prev.filter((o) => o.id !== activeOrder.id))
      setActiveOrder(null)
      setCurrentView("orders")
    }
  }

  if (currentView === "success") {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">Trip Completed!</h2>
            <p className="text-gray-600 mb-4">You have successfully completed the ride.</p>
            <div className="bg-white p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-500">Fare Earned</p>
              <p className="text-3xl font-bold text-green-600">${activeOrder?.fare}</p>
            </div>
            <Button onClick={handleCompleteOrder} className="w-full">
              Back to Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (currentView === "driving" && activeOrder) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="h-[60vh] relative">
          <LeafletMapWithRouting
            pickupCoords={activeOrder.pickupCoords}
            dropoffCoords={activeOrder.dropoffCoords}
            pickupAddress={activeOrder.pickupAddress}
            dropoffAddress={activeOrder.dropoffAddress}
          />
        </div>
        <div className="p-4 bg-white">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Active Trip</CardTitle>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Route Planned
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium">{activeOrder.customerName}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {activeOrder.customerPhone}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="h-3 w-3 bg-green-500 rounded-full mt-1"></div>
                  <div>
                    <p className="text-sm font-medium">Pickup</p>
                    <p className="text-sm text-gray-600">{activeOrder.pickupAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-3 w-3 bg-red-500 rounded-full mt-1"></div>
                  <div>
                    <p className="text-sm font-medium">Dropoff</p>
                    <p className="text-sm text-gray-600">{activeOrder.dropoffAddress}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Distance</p>
                  <p className="font-medium">{activeOrder.distance}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Fare</p>
                  <p className="font-medium">${activeOrder.fare}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">ETA</p>
                  <p className="font-medium">{activeOrder.estimatedTime}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={() => setCurrentView("success")} className="flex-1">
                  Complete Trip
                </Button>
                <Button onClick={() => setCurrentView("orders")} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b p-4">
        <h1 className="text-xl font-bold text-gray-900">Available Orders</h1>
        <p className="text-sm text-gray-500">{orders.length} orders available</p>
      </div>

      <div className="p-4 space-y-4">
        {orders.map((order) => (
          <Card key={order.id} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-500" />
                  <span className="font-medium">{order.customerName}</span>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  ${order.fare}
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2">
                  <div className="h-3 w-3 bg-green-500 rounded-full mt-1 flex-shrink-0"></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">Pickup</p>
                    <p className="text-sm text-gray-600 break-words">{order.pickupAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-3 w-3 bg-red-500 rounded-full mt-1 flex-shrink-0"></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">Dropoff</p>
                    <p className="text-sm text-gray-600 break-words">{order.dropoffAddress}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Navigation className="h-4 w-4" />
                    {order.distance}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {order.estimatedTime}
                  </div>
                </div>
              </div>

              <Button onClick={() => handleAcceptOrder(order)} className="w-full" disabled={order.status !== "pending"}>
                {order.status === "pending" ? "Accept Order" : "Order Accepted"}
              </Button>
            </CardContent>
          </Card>
        ))}

        {orders.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders available</h3>
            <p className="text-gray-500">Check back later for new ride requests.</p>
          </div>
        )}
      </div>
    </div>
  )
}
