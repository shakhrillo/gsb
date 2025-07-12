import Image from "next/image"
import { useEffect, useState } from "react"
import { getProducts } from "@/services/api.services"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Check, Plus, PlusIcon, ShoppingCart, Star } from "lucide-react"

export const ProductView = ({
  setShowBasket,
  getBasketItemCount,
  goBack,
  addToBasket,
  selectedMerchant,
}: {
  setShowBasket: (show: boolean) => void
  getBasketItemCount: () => number
  goBack: () => void
  addToBasket: (product: any, merchant: any) => void
  selectedMerchant: any
}) => {
  const [merchantProducts, setMerchantProducts] = useState<any[]>([])
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    if (!selectedMerchant) return
    getProducts(selectedMerchant.id)
      .then(setMerchantProducts)
      .catch((err) => {
        console.error("Error fetching products:", err)
        setMerchantProducts([])
      })
  }, [selectedMerchant])

  const getBadgeColor = (badge: string) => {
    const colors: Record<string, string> = {
      Sale: "bg-red-500 hover:bg-red-600",
      New: "bg-green-500 hover:bg-green-600",
      Popular: "bg-blue-500 hover:bg-blue-600",
    }
    return colors[badge] || "bg-purple-500 hover:bg-purple-600"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={goBack} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">{selectedMerchant?.name}</h1>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{selectedMerchant?.rating}</span>
              <span>•</span>
              <span>{selectedMerchant?.deliveryTime}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="relative p-2" onClick={() => setShowBasket(true)}>
            <ShoppingCart className="h-5 w-5" />
            {getBasketItemCount() > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500">
                {getBasketItemCount()}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Products */}
      <div className="p-4">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {merchantProducts.length} Products
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {merchantProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="relative bg-black/5 hover:bg-black/10">
                  <Image
                    src={product.photo}
                    alt={product.name}
                    width={200}
                    height={200}
                    className="w-full h-40 sm:h-48 object-contain"
                  />
                  {product.badge && (
                    <Badge
                      className={`absolute top-2 left-2 text-xs ${getBadgeColor(product.badge)}`}
                    >
                      {product.badge}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white rounded-full"
                    onClick={() => console.log(product.id)}
                  >
                    {favorites.includes(product.id) ? (
                      <Check className="h-4 w-4 text-red-500" />
                    ) : (
                      <PlusIcon className="h-4 w-4 text-gray-600" />
                    )}
                  </Button>
                </div>

                <div className="p-3">
                  <h3 className="mb-1 text-sm font-medium text-gray-900 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="mb-2 text-xs text-gray-500">
                    {product.description || "No description available."}
                  </p>
                  <div className="mb-2 flex items-center gap-1 text-xs text-gray-600">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{product.rating || "-"}</span>
                    <span className="text-gray-400">({product.reviews || "0"})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">${product.price}</span>
                    {product.unitOfMeasure && (
                      <span className="text-xs text-gray-500">{product.unitOfMeasure}</span>
                    )}
                  </div>
                </div>

                <Button size="sm" className="w-full" onClick={() => addToBasket(product, selectedMerchant)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add to Basket
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {merchantProducts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No products available from this merchant.
          </div>
        )}
      </div>
    </div>
  )
}
