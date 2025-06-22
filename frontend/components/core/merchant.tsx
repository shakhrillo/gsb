import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Star, ChevronRight, MapPin, Clock, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react"
import { getMerchants } from "@/services/api.services"

export const MerchantView = ({
  setShowBasket,
  getBasketItemCount,
  setSelectedMerchant,
}: {
  setShowBasket: (show: boolean) => void
  getBasketItemCount: () => number
  setSelectedMerchant: (merchant: any) => void
}) => {
  const [merchantCategories, setMerchantCategories] = useState([
    { id: "all", label: "All", active: true }
  ])
  const [activeCategory, setActiveCategory] = useState("all")
  const [filteredMerchants, setFilteredMerchants] = useState<any[]>([])

  useEffect(() => {
    
  }, [activeCategory])

  useEffect(() => {
    getMerchants()
      .then((data: any) => {
        setFilteredMerchants(data);
        const uniqueCategories = Array.from(
          new Set(data.map((merchant: any) => merchant.category))
        ).map((category) => ({
          id: (category as string).toLowerCase(),
          label: (category as string).charAt(0).toUpperCase() + (category as string).slice(1),
          active: (category as string).toLowerCase() === "all",
        }));

        setMerchantCategories([
          { id: "all", label: "All", active: true },
          ...uniqueCategories
        ]);
      })
      .catch((error) => {
        console.error("Error fetching products:", error)
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Filter Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-gray-900">Merchants</h1>
          <Button variant="ghost" size="sm" className="relative p-2" onClick={() => setShowBasket(true)}>
            <ShoppingCart className="h-5 w-5" />
            {getBasketItemCount() > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500">
                {getBasketItemCount()}
              </Badge>
            )}
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {merchantCategories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "default" : "outline"}
              size="sm"
              className={`whitespace-nowrap flex-shrink-0 ${
                activeCategory === category.id ? "bg-black text-white" : "bg-white text-gray-700 border-gray-300"
              }`}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Merchants List */}
      <div className="p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{filteredMerchants.length} Merchants</h2>
        </div>

        <div className="space-y-3">
          {filteredMerchants.map((merchant) => (
            <Card
              key={merchant.id}
              className="overflow-hidden border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedMerchant(merchant)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Image
                      src={merchant.image || "/placeholder.svg"}
                      alt={merchant.name}
                      width={60}
                      height={60}
                      className="w-15 h-15 rounded-lg object-cover"
                    />
                    {merchant.badge && (
                      <Badge
                        className={`absolute -top-1 -right-1 text-xs px-1 py-0 ${
                          merchant.badge === "Popular"
                            ? "bg-blue-500 hover:bg-blue-600"
                            : merchant.badge === "New"
                              ? "bg-green-500 hover:bg-green-600"
                              : merchant.badge === "Top Rated"
                                ? "bg-purple-500 hover:bg-purple-600"
                                : "bg-red-500 hover:bg-red-600"
                        }`}
                      >
                        {merchant.badge}
                      </Badge>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{merchant.name}</h3>
                      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-gray-600 ml-1">{merchant.rating}</span>
                      </div>
                      <span className="text-sm text-gray-400">({merchant.reviews})</span>
                      <span className="text-sm text-gray-400">•</span>
                      <span className="text-sm text-gray-600">{merchant.productsCount} items</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{merchant.deliveryTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{merchant.distance}</span>
                      </div>
                      <span className={merchant.deliveryFee === "Free" ? "text-green-600 font-medium" : ""}>
                        {merchant.deliveryFee} delivery
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredMerchants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No merchants found in this category.</p>
          </div>
        )}
      </div>
    </div>
  )
}