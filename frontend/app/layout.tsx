import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "Yo'lda",
  description: 'Tez va oson buyurtma qilish uchun platforma'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
