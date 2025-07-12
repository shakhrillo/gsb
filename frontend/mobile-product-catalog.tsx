"use client";
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: {
            username?: string;
          };
        };
        ready?: () => void;
        close?: () => void;
      };
    };
  }
}

import { useState } from "react";
import { ProductView } from "./components/core/product";
import { MerchantView } from "./components/core/merchant";
import { BasketView } from "./components/core/basket";
import { BasketItem } from "./services/api.services";

export default function Component() {
  const [basket, setBasket] = useState<BasketItem[]>([])
  const [showBasket, setShowBasket] = useState(false)
  const addToBasket = (product: any, merchant: any) => {
    // const merchantName = merchants.find((m) => m.id === merchantId)?.name || ""

    setBasket((prev) => {
      const existingItem = prev.find((item) => item.id === product.id)
      if (existingItem) {
        return prev.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      } else {
        return [
          ...prev,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            merchantId: merchant.id,
            merchantName: merchant.name,
            quantity: 1,
          },
        ]
      }
    })
  }

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity === 0) {
      setBasket((prev) => prev.filter((item) => item.id !== productId))
    } else {
      setBasket((prev) => prev.map((item) => (item.id === productId ? { ...item, quantity: newQuantity } : item)))
    }
  }

  const removeFromBasket = (productId: number) => {
    setBasket((prev) => prev.filter((item) => item.id !== productId))
  }

  const getBasketItemCount = () => {
    return basket.reduce((total, item) => total + item.quantity, 0)
  }

  const getBasketTotal = () => {
    return basket.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const [selectedMerchant, setSelectedMerchant] = useState<any>(null)

  if( showBasket ) {
    return <BasketView 
      basket={basket}
      setShowBasket={setShowBasket}
      getBasketItemCount={getBasketItemCount}
      updateQuantity={updateQuantity}
      removeFromBasket={removeFromBasket}
      getBasketTotal={getBasketTotal}
    />
  }

  if (selectedMerchant) {
    return <ProductView  goBack={() => setSelectedMerchant(null)} selectedMerchant={selectedMerchant} getBasketItemCount={getBasketItemCount} setShowBasket={setShowBasket} addToBasket={addToBasket} />
  }

  return <MerchantView setSelectedMerchant={setSelectedMerchant} getBasketItemCount={getBasketItemCount} setShowBasket={setShowBasket} />
}
