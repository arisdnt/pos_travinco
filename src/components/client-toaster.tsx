"use client"

import { useEffect, useState } from 'react'
import { Toaster } from '@/components/ui/toaster'

export default function ClientToaster() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  return <Toaster />
}