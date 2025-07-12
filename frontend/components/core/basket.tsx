import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, Star, ArrowLeft, ChevronRight, MapPin, Clock, ShoppingCart, Plus, Minus, X } from "lucide-react"

interface BasketItem {
  id: number
  name: string
  price: number
  image: string
  merchantId: number
  merchantName: string
  quantity: number
}

export const BasketView = ({
  basket,
  setShowBasket,
  getBasketItemCount,
  updateQuantity,
  removeFromBasket,
  getBasketTotal,
}: {
  basket: BasketItem[]
  setShowBasket: (show: boolean) => void
  getBasketItemCount: () => number
  updateQuantity: (id: number, quantity: number) => void
  removeFromBasket: (id: number) => void
  getBasketTotal: () => number
}) => {

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Basket Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowBasket(false)} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Your Basket</h1>
            <p className="text-xs text-gray-500">{getBasketItemCount()} items</p>
          </div>
        </div>
      </div>

      {/* Basket Content */}
      <div className="p-4">
        {basket.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Your basket is empty</p>
            <Button onClick={() => setShowBasket(false)}>Continue Shopping</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {basket.map((item) => (
                <Card key={item.id} className="overflow-hidden border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-gray-900 truncate">{item.name}</h3>
                        <p className="text-xs text-gray-500">{item.merchantName}</p>
                        <p className="font-semibold text-gray-900">${item.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          onClick={() => removeFromBasket(item.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Basket Summary */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-lg text-gray-900">${getBasketTotal().toFixed(2)}</span>
                </div>
                <Button className="w-full" size="lg">
                  Proceed to Checkout
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}