"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, Star, ArrowLeft, ChevronRight, MapPin, Clock, PlusCircle, PlusSquareIcon, PlusIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { getMerchants, getProducts } from "./services/api.services"

const merchantCategories = [
  { id: "all", label: "All", active: true },
  { id: "restaurants", label: "Restaurants", active: false },
  { id: "fashion", label: "Fashion", active: false },
  { id: "electronics", label: "Electronics", active: false },
  { id: "grocery", label: "Grocery", active: false },
  { id: "pharmacy", label: "Pharmacy", active: false },
  { id: "beauty", label: "Beauty", active: false },
]

const merchants = [
  {
    id: 1,
    name: "TechWorld Electronics",
    category: "electronics",
    rating: 4.8,
    reviews: 1250,
    deliveryTime: "30-45 min",
    deliveryFee: "Free",
    distance: "1.2 km",
    image: "/placeholder.svg?height=100&width=100",
    badge: "Popular",
    productsCount: 156,
  },
  {
    id: 2,
    name: "Fashion Hub",
    category: "fashion",
    rating: 4.6,
    reviews: 890,
    deliveryTime: "45-60 min",
    deliveryFee: "$2.99",
    distance: "2.1 km",
    image: "/placeholder.svg?height=100&width=100",
    badge: "New",
    productsCount: 89,
  },
  {
    id: 3,
    name: "Bella's Bistro",
    category: "restaurants",
    rating: 4.9,
    reviews: 2100,
    deliveryTime: "25-40 min",
    deliveryFee: "Free",
    distance: "0.8 km",
    image: "/placeholder.svg?height=100&width=100",
    badge: "Top Rated",
    productsCount: 45,
  },
  {
    id: 4,
    name: "Fresh Market",
    category: "grocery",
    rating: 4.5,
    reviews: 567,
    deliveryTime: "20-35 min",
    deliveryFee: "$1.99",
    distance: "1.5 km",
    image: "/placeholder.svg?height=100&width=100",
    productsCount: 234,
  },
  {
    id: 5,
    name: "Beauty Corner",
    category: "beauty",
    rating: 4.7,
    reviews: 445,
    deliveryTime: "40-55 min",
    deliveryFee: "Free",
    distance: "2.3 km",
    image: "/placeholder.svg?height=100&width=100",
    badge: "Sale",
    productsCount: 78,
  },
  {
    id: 6,
    name: "HealthPlus Pharmacy",
    category: "pharmacy",
    rating: 4.4,
    reviews: 332,
    deliveryTime: "15-30 min",
    deliveryFee: "$0.99",
    distance: "0.5 km",
    image: "/placeholder.svg?height=100&width=100",
    productsCount: 123,
  },
]

const productsByMerchant = {
  1: [
    // TechWorld Electronics
    {
      id: 1,
      name: "Wireless Bluetooth Headphones",
      price: 79.99,
      originalPrice: 99.99,
      rating: 4.5,
      reviews: 128,
      image: "/placeholder.svg?height=200&width=200",
      badge: "Sale",
    },
    {
      id: 2,
      name: "Smart Home Security Camera",
      price: 149.99,
      rating: 4.7,
      reviews: 203,
      image: "/placeholder.svg?height=200&width=200",
      badge: "Popular",
    },
    {
      id: 3,
      name: "Smartphone Case",
      price: 19.99,
      rating: 4.3,
      reviews: 89,
      image: "/placeholder.svg?height=200&width=200",
    },
  ],
  2: [
    // Fashion Hub
    {
      id: 4,
      name: "Cotton Blend T-Shirt",
      price: 24.99,
      rating: 4.2,
      reviews: 89,
      image: "/placeholder.svg?height=200&width=200",
      badge: "New",
    },
    {
      id: 5,
      name: "Denim Jeans",
      price: 59.99,
      originalPrice: 79.99,
      rating: 4.4,
      reviews: 156,
      image: "/placeholder.svg?height=200&width=200",
      badge: "Sale",
    },
  ],
  3: [
    // Bella's Bistro
    {
      id: 6,
      name: "Margherita Pizza",
      price: 12.99,
      rating: 4.8,
      reviews: 342,
      image: "/placeholder.svg?height=200&width=200",
      badge: "Bestseller",
    },
    {
      id: 7,
      name: "Caesar Salad",
      price: 8.99,
      rating: 4.6,
      reviews: 178,
      image: "/placeholder.svg?height=200&width=200",
    },
  ],
}

export default function Component() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [selectedMerchant, setSelectedMerchant] = useState<number | null>(null)
  const [favorites, setFavorites] = useState<number[]>([])

  const toggleFavorite = (productId: number) => {
    setFavorites((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]))
  }

  const [filteredMerchants, setFilteredMerchants] = useState([] as any[])

  // const filteredMerchants =
  //   activeCategory === "all" ? merchants : merchants.filter((merchant) => merchant.category === activeCategory)

  const selectedMerchantData = filteredMerchants.find((m) => {
    return m.id === selectedMerchant
  });
  const [merchantProducts, setMerchantProducts] = useState<any[]>([]);
  // const merchantProducts = selectedMerchant ? productsByMerchant[selectedMerchant] || [] : []

  useEffect(() => {
    if (!selectedMerchantData) return;

    getProducts(selectedMerchantData?.id || "")
      .then((data: any) => {
        console.log('Products for selected merchant:', data);
        setMerchantProducts(data);
      })
      .catch((error) => {
        console.error("Error fetching products:", error)
      })
  }, [selectedMerchantData])

  useEffect(() => {
    getMerchants()
      .then((data: any) => {
        setFilteredMerchants(data);
      })
      .catch((error) => {
        console.error("Error fetching products:", error)
      })
  }, [])

  if (selectedMerchant) {
    // Products View
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header with Back Button */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedMerchant(null)} className="p-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="font-semibold text-gray-900">{selectedMerchantData?.name}</h1>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{selectedMerchantData?.rating}</span>
                <span>•</span>
                <span>{selectedMerchantData?.deliveryTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{merchantProducts.length} Products</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {merchantProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden border-0 shadow-sm">
                <CardContent className="p-0">
                  <div className="relative">
                    <Image
                      src={product.photo || "/placeholder.svg"}
                      alt={product.name}
                      width={200}
                      height={200}
                      className="w-full h-40 sm:h-48 object-cover"
                    />

                    {product.badge && (
                      <Badge
                        className={`absolute top-2 left-2 text-xs ${
                          product.badge === "Sale"
                            ? "bg-red-500 hover:bg-red-600"
                            : product.badge === "New"
                              ? "bg-green-500 hover:bg-green-600"
                              : product.badge === "Popular"
                                ? "bg-blue-500 hover:bg-blue-600"
                                : "bg-purple-500 hover:bg-purple-600"
                        }`}
                      >
                        {product.badge}
                      </Badge>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white rounded-full"
                      onClick={() => toggleFavorite(product.id)}
                    >
                      <PlusIcon
                        className={`h-4 w-4 ${
                          favorites.includes(product.id) ? "fill-red-500 text-red-500" : "text-gray-600"
                        }`}
                      />
                    </Button>
                  </div>

                  <div className="p-3">
                    <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-2">{product.name}</h3>
                    {/* subtitle */}
                    <div className="text-xs text-gray-500 mb-2">
                      {product.description || "No description available."}
                    </div>

                    <div className="flex items-center gap-1 mb-2">
                      <div className="flex items-center">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-gray-600 ml-1">{product.rating || '-'}</span>
                      </div>
                      <span className="text-xs text-gray-400">({product.reviews || '0'})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">${product.price}</span>
                      {product.unitOfMeasure && (
                        <span className="text-xs text-gray-500">${product.unitOfMeasure}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {merchantProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No products available from this merchant.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Merchants View
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Filter Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
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
              onClick={() => setSelectedMerchant(merchant.id)}
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
