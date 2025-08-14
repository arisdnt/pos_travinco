"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"

interface DateTimeDisplayProps {
  className?: string
  showIcon?: boolean
  format?: "full" | "date-only" | "time-only"
}

export function DateTimeDisplay({ 
  className = "", 
  showIcon = true, 
  format = "full" 
}: DateTimeDisplayProps) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
    return date.toLocaleDateString('id-ID', options)
  }

  const formatTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }
    return date.toLocaleTimeString('id-ID', options)
  }

  const getDisplayText = () => {
    switch (format) {
      case "date-only":
        return formatDate(currentDateTime)
      case "time-only":
        return formatTime(currentDateTime)
      case "full":
      default:
        return `${formatDate(currentDateTime)} • ${formatTime(currentDateTime)}`
    }
  }

  return (
    <div className={`flex items-center space-x-2 text-sm font-medium text-gray-600 dark:text-gray-300 ${className}`}>
      {showIcon && (
        <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      )}
      <span className="whitespace-nowrap">
        {getDisplayText()}
      </span>
    </div>
  )
}

export default DateTimeDisplay