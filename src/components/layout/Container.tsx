// src/components/layout/Container.tsx

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface ContainerProps {
  children: ReactNode
  className?: string
}

// Max-width of 75rem (1200px) — content never stretches wider on large screens.
// Horizontal padding scales with viewport: 16px mobile → 24px tablet → 32px desktop.
export default function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn('max-w-300 mx-auto w-full px-4 md:px-6 lg:px-8', className)}>
      {children}
    </div>
  )
}
