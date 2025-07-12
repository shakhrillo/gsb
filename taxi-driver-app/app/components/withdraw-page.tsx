"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, CreditCard, DollarSign, Clock, CheckCircle } from "lucide-react"

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

interface WithdrawPageProps {
  driverStats: DriverStats
  onBack: () => void
}

const withdrawHistory = [
  { id: "1", date: "Dec 15, 2024", amount: 500.0, status: "completed", method: "Bank Transfer" },
  { id: "2", date: "Dec 8, 2024", amount: 750.25, status: "completed", method: "PayPal" },
  { id: "3", date: "Dec 1, 2024", amount: 425.5, status: "completed", method: "Bank Transfer" },
  { id: "4", date: "Nov 24, 2024", amount: 300.0, status: "pending", method: "Bank Transfer" },
]

export default function WithdrawPage({ driverStats, onBack }: WithdrawPageProps) {
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [selectedMethod, setSelectedMethod] = useState("bank")

  const handleWithdraw = () => {
    const amount = Number.parseFloat(withdrawAmount)
    if (amount > 0 && amount <= driverStats.availableBalance) {
      // Process withdrawal
      alert(`Withdrawal of $${amount.toFixed(2)} initiated successfully!`)
      setWithdrawAmount("")
    }
  }

  const quickAmounts = [50, 100, 250, 500]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-gray-900">Withdraw Earnings</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Available Balance */}
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-6 w-6" />
              <span className="text-green-100">Available Balance</span>
            </div>
            <p className="text-3xl font-bold">${driverStats.availableBalance.toFixed(2)}</p>
            <p className="text-green-100 text-sm mt-1">Ready to withdraw</p>
          </CardContent>
        </Card>

        {/* Withdraw Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Withdraw Funds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Amount Buttons */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Quick amounts:</p>
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setWithdrawAmount(amount.toString())}
                    disabled={amount > driverStats.availableBalance}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label className="text-sm text-gray-600 mb-2 block">Enter amount:</label>
              <Input
                type="number"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum: ${driverStats.availableBalance.toFixed(2)}</p>
            </div>

            {/* Withdrawal Method */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Withdrawal method:</p>
              <div className="space-y-2">
                <div
                  className={`p-3 border rounded-lg cursor-pointer ${
                    selectedMethod === "bank" ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  }`}
                  onClick={() => setSelectedMethod("bank")}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Bank Transfer</p>
                      <p className="text-sm text-gray-500">1-2 business days • No fees</p>
                    </div>
                  </div>
                </div>
                <div
                  className={`p-3 border rounded-lg cursor-pointer ${
                    selectedMethod === "paypal" ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  }`}
                  onClick={() => setSelectedMethod("paypal")}
                >
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">PayPal</p>
                      <p className="text-sm text-gray-500">Instant • 2.5% fee</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleWithdraw}
              className="w-full"
              disabled={
                !withdrawAmount ||
                Number.parseFloat(withdrawAmount) <= 0 ||
                Number.parseFloat(withdrawAmount) > driverStats.availableBalance
              }
            >
              Withdraw ${withdrawAmount || "0.00"}
            </Button>
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {withdrawHistory.map((withdrawal) => (
              <div key={withdrawal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {withdrawal.status === "completed" ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-500" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">${withdrawal.amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{withdrawal.date}</p>
                    <p className="text-xs text-gray-400">{withdrawal.method}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      withdrawal.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {withdrawal.status}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
