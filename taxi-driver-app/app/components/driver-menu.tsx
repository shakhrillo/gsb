"use client"
import { Button } from "@/components/ui/button"
import { CreditCard, Settings, BarChart3, LogOut, X, User } from "lucide-react"

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

interface DriverMenuProps {
  driverStats: DriverStats
  onMenuItemClick: (view: string) => void
  onClose: () => void
}

export default function DriverMenu({ driverStats, onMenuItemClick, onClose }: DriverMenuProps) {
  return (
    <div className="absolute top-full left-0 right-0 z-50 bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white shadow-lg rounded-b-lg mx-4 mt-2" onClick={(e) => e.stopPropagation()}>
        <div className="p-4">
          {/* Driver Info */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">John Driver</h3>
              <p className="text-sm text-gray-500">
                ⭐ {driverStats.rating} • {driverStats.totalTrips} trips
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto p-1">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-600">Today's Earnings</p>
              <p className="text-lg font-bold text-green-700">${driverStats.todayEarnings.toFixed(2)}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-600">Available Balance</p>
              <p className="text-lg font-bold text-blue-700">${driverStats.availableBalance.toFixed(2)}</p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12"
              onClick={() => onMenuItemClick("earnings")}
            >
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <div className="text-left">
                <p className="font-medium">Earnings</p>
                <p className="text-xs text-gray-500">View detailed earnings</p>
              </div>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12"
              onClick={() => onMenuItemClick("withdraw")}
            >
              <CreditCard className="h-5 w-5 text-green-500" />
              <div className="text-left">
                <p className="font-medium">Withdraw</p>
                <p className="text-xs text-gray-500">Cash out earnings</p>
              </div>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12"
              onClick={() => onMenuItemClick("profile")}
            >
              <Settings className="h-5 w-5 text-gray-500" />
              <div className="text-left">
                <p className="font-medium">Profile & Settings</p>
                <p className="text-xs text-gray-500">Manage your account</p>
              </div>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Sign Out</p>
                <p className="text-xs text-red-400">Log out of your account</p>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
