"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, User, Phone, Navigation, CheckCircle, Menu } from "lucide-react"
import dynamic from "next/dynamic"
import DriverMenu from "./components/driver-menu"
import EarningsPage from "./components/earnings-page"
import WithdrawPage from "./components/withdraw-page"
import ProfilePage from "./components/profile-page"
import TripHeader from "./components/trip-header"

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

interface DriverStats {
  totalEarnings: number
  todayEarnings: number
  weeklyEarnings: number
  monthlyEarnings: number
  totalTrips: number
  todayTrips: number
  rating: number
  availableBalance: number
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
  const [currentView, setCurrentView] = useState<
    "orders" | "driving" | "success" | "earnings" | "withdraw" | "profile"
  >("orders")
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [driverStats, setDriverStats] = useState<DriverStats>({
    totalEarnings: 2847.5,
    todayEarnings: 127.25,
    weeklyEarnings: 892.75,
    monthlyEarnings: 2847.5,
    totalTrips: 156,
    todayTrips: 8,
    rating: 4.8,
    availableBalance: 2847.5,
  })

  const handleAcceptOrder = (order: Order) => {
    setActiveOrder(order)
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "accepted" } : o)))
    setCurrentView("driving")
  }

  const handleCompleteOrder = () => {
    if (activeOrder) {
      // Update driver stats
      setDriverStats((prev) => ({
        ...prev,
        totalEarnings: prev.totalEarnings + activeOrder.fare,
        todayEarnings: prev.todayEarnings + activeOrder.fare,
        weeklyEarnings: prev.weeklyEarnings + activeOrder.fare,
        monthlyEarnings: prev.monthlyEarnings + activeOrder.fare,
        totalTrips: prev.totalTrips + 1,
        todayTrips: prev.todayTrips + 1,
        availableBalance: prev.availableBalance + activeOrder.fare,
      }))

      setOrders((prev) => prev.filter((o) => o.id !== activeOrder.id))
      setActiveOrder(null)
      setCurrentView("success")
    }
  }

  const handleMenuItemClick = (view: string) => {
    setCurrentView(view as any)
    setShowMenu(false)
  }

  if (currentView === "earnings") {
    return <EarningsPage driverStats={driverStats} onBack={() => setCurrentView("orders")} />
  }

  if (currentView === "withdraw") {
    return <WithdrawPage driverStats={driverStats} onBack={() => setCurrentView("orders")} />
  }

  if (currentView === "profile") {
    return <ProfilePage onBack={() => setCurrentView("orders")} />
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
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-blue-600">Today's Total</p>
              <p className="text-xl font-bold text-blue-700">${driverStats.todayEarnings.toFixed(2)}</p>
            </div>
            <Button onClick={() => setCurrentView("orders")} className="w-full">
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
        {/* Header with menu */}
        <TripHeader activeOrder={activeOrder} />

        <div className="h-[100vh] relative">
          <LeafletMapWithRouting
            pickupCoords={activeOrder.pickupCoords}
            dropoffCoords={activeOrder.dropoffCoords}
            pickupAddress={activeOrder.pickupAddress}
            dropoffAddress={activeOrder.dropoffAddress}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with menu */}
      <div className="bg-white shadow-sm border-b p-4 flex items-center justify-between relative">
        <Button variant="ghost" size="sm" onClick={() => setShowMenu(!showMenu)} className="p-2">
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-gray-900">Available Orders</h1>
        <div className="text-sm text-green-600 font-medium">${driverStats.todayEarnings.toFixed(2)} today</div>

        {showMenu && (
          <DriverMenu
            driverStats={driverStats}
            onMenuItemClick={handleMenuItemClick}
            onClose={() => setShowMenu(false)}
          />
        )}
      </div>

      {/* Quick stats bar */}
      <div className="bg-white border-b p-4">
        <div className="flex justify-between items-center text-sm">
          <div className="text-center">
            <p className="text-gray-500">Today's Trips</p>
            <p className="font-bold text-blue-600">{driverStats.todayTrips}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500">Rating</p>
            <p className="font-bold text-yellow-600">⭐ {driverStats.rating}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500">Available</p>
            <p className="font-bold text-gray-600">{orders.length} orders</p>
          </div>
        </div>
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
