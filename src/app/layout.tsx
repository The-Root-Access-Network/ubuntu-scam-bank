// src/app/layout.tsx

import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

// Variable names here must match what @theme references in globals.css.
// next/font sets these as CSS custom properties on the <html> element.
const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600'],
  display: 'swap',
})

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'UbuntuScamBank',
    template: '%s | UbuntuScamBank',
  },
  description: 'Report scams. Protect others. Earn points.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}

