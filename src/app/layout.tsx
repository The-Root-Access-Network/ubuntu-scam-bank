// src/app/layout.tsx

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UbuntuScamBank',
  description: 'Report scams. Protect others. Earn points.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
