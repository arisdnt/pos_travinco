"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus, Edit, Trash2, Download, Upload, Filter, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface NavbarAction {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: () => void
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  className?: string
}

interface NavbarProps {
  title: string
  showBackButton?: boolean
  backUrl?: string
  actions?: NavbarAction[]
  className?: string
  children?: React.ReactNode
}

export function Navbar({
  title,
  showBackButton = false,
  backUrl,
  actions = [],
  className,
  children
}: NavbarProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl)
    } else {
      router.back()
    }
  }

  return (
    <div className={cn(
      "sticky top-0 z-40 bg-white dark:bg-gray-900",
      className
    )}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Back Button & Title */}
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {title}
              </h1>
            </div>
          </div>

          {/* Center Section - Custom Content */}
          {children && (
            <div className="flex-1 flex justify-center px-4">
              {children}
            </div>
          )}

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-2">
            {actions.map((action, index) => {
              const IconComponent = action.icon
              return (
                <Button
                  key={index}
                  variant={action.variant || "default"}
                  size="sm"
                  onClick={action.onClick}
                  className={cn(
                    "flex items-center space-x-2",
                    action.className
                  )}
                >
                  {IconComponent && <IconComponent className="h-4 w-4" />}
                  <span className="hidden sm:inline">{action.label}</span>
                  <span className="sm:hidden">
                    {IconComponent ? <IconComponent className="h-4 w-4" /> : action.label}
                  </span>
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Predefined action creators for common use cases
export const createNavbarActions = {
  add: (onClick: () => void, label: string = "Tambah"): NavbarAction => ({
    label,
    icon: Plus,
    onClick,
    variant: "default",
    className: "bg-blue-600 hover:bg-blue-700 text-white"
  }),

  edit: (onClick: () => void, label: string = "Edit"): NavbarAction => ({
    label,
    icon: Edit,
    onClick,
    variant: "outline"
  }),

  delete: (onClick: () => void, label: string = "Hapus"): NavbarAction => ({
    label,
    icon: Trash2,
    onClick,
    variant: "destructive"
  }),

  download: (onClick: () => void, label: string = "Download"): NavbarAction => ({
    label,
    icon: Download,
    onClick,
    variant: "outline"
  }),

  upload: (onClick: () => void, label: string = "Upload"): NavbarAction => ({
    label,
    icon: Upload,
    onClick,
    variant: "outline"
  }),

  filter: (onClick: () => void, label: string = "Filter"): NavbarAction => ({
    label,
    icon: Filter,
    onClick,
    variant: "ghost"
  }),

  search: (onClick: () => void, label: string = "Cari"): NavbarAction => ({
    label,
    icon: Search,
    onClick,
    variant: "ghost"
  })
}