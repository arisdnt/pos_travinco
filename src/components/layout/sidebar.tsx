"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  FileText,
  ChefHat,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "text-blue-500",
  },
  {
    name: "Bahan Baku",
    href: "/dashboard/bahan-baku",
    icon: Package,
    color: "text-orange-500",
  },
  {
    name: "Resep",
    href: "/dashboard/resep",
    icon: ChefHat,
    color: "text-green-500",
  },
  {
    name: "Produk Jadi",
    href: "/dashboard/produk-jadi",
    icon: Users,
    color: "text-purple-500",
  },
  {
    name: "Pembelian",
    href: "/dashboard/pembelian",
    icon: ShoppingCart,
    color: "text-red-500",
  },
  {
    name: "Penjualan",
    href: "/dashboard/penjualan",
    icon: TrendingUp,
    color: "text-emerald-500",
  },
  {
    name: "Laporan",
    href: "/dashboard/laporan",
    icon: FileText,
    color: "text-indigo-500",
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Berhasil',
        description: 'Logout berhasil!',
      })
      
      router.push('/login')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat logout',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn(
      "flex h-full flex-col bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-800 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header with Logo and Toggle */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
        {!isCollapsed && (
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Travinco
            </h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 -mt-1">
              Parfum Stoks
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative",
                isActive
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-400"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={cn(
                "h-5 w-5 flex-shrink-0",
                isCollapsed ? "" : "mr-3",
                item.color
              )} />
              {!isCollapsed && (
                <span className="truncate">{item.name}</span>
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-800 space-y-2">
        {/* Theme Toggle */}
        <div className={cn(
          "flex items-center",
          isCollapsed ? "justify-center" : "px-3"
        )}>
          {!isCollapsed && (
            <span className="text-sm text-gray-600 dark:text-gray-400 mr-3">
              Theme
            </span>
          )}
          <ThemeToggle />
        </div>
        
        {/* Logout Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={isLoading}
          className={cn(
            "w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 transition-colors",
            isCollapsed ? "px-2" : "justify-start px-3"
          )}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className={cn(
            "h-4 w-4",
            isCollapsed ? "" : "mr-3"
          )} />
          {!isCollapsed && "Logout"}
        </Button>
        
        {/* Footer */}
        {!isCollapsed && (
          <div className="px-3 pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © 2024 Travinco
            </p>
          </div>
        )}
      </div>
    </div>
  )
}