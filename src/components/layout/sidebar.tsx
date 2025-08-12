"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { useTheme } from "next-themes"


type NavigationItem = {
  name: string
  href?: string
  icon: any
  color: string
  isGroup?: boolean
  children?: NavigationItem[]
}
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
  ChevronDown,
  ChevronUp,
  Database,
  Tag,
  Settings,
  Ruler,
  Sun,
  Moon,
} from "lucide-react"

const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "text-blue-500",
  },
  {
    name: "Master Data",
    icon: Database,
    color: "text-cyan-500",
    isGroup: true,
    children: [
      {
        name: "Supplier",
        href: "/dashboard/master-data/supplier",
        icon: Users,
        color: "text-blue-500",
      },
      {
        name: "Kategori",
        href: "/dashboard/master-data/kategori",
        icon: Tag,
        color: "text-green-500",
      },
      {
        name: "Unit Dasar",
        href: "/dashboard/master-data/unit-dasar",
        icon: Ruler,
        color: "text-purple-500",
      },
      {
        name: "Kemasan",
        href: "/dashboard/master-data/kemasan",
        icon: Package,
        color: "text-orange-500",
      },
      {
        name: "Reservasi Stok",
        href: "/dashboard/master-data/reservasi-stok",
        icon: Settings,
        color: "text-gray-500",
      },
    ],
  },
  {
    name: "Inventory",
    icon: Package,
    color: "text-orange-500",
    isGroup: true,
    children: [
      {
        name: "Bahan Baku",
        href: "/dashboard/bahan-baku",
        icon: Package,
        color: "text-orange-500",
      },
      {
        name: "Produk Jadi",
        href: "/dashboard/produk-jadi",
        icon: Users,
        color: "text-purple-500",
      },
      {
        name: "Resep",
        href: "/dashboard/resep",
        icon: ChefHat,
        color: "text-green-500",
      },
    ],
  },
  {
    name: "Transaksi",
    icon: ShoppingCart,
    color: "text-red-500",
    isGroup: true,
    children: [
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
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Master Data', 'Inventory'])

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      // Jika menu sudah terbuka, tutup menu tersebut
      if (prev.includes(groupName)) {
        return prev.filter(name => name !== groupName)
      }
      
      // Jika sudah ada 2 menu terbuka, hapus yang paling lama (FIFO)
      if (prev.length >= 2) {
        return [...prev.slice(1), groupName]
      }
      
      // Jika belum ada 2 menu, tambahkan menu baru
      return [...prev, groupName]
    })
  }

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
      <div className="flex h-16 items-center justify-between px-4">
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
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon
          
          // Handle group items with children
          if (item.isGroup && item.children) {
            const isExpanded = expandedGroups.includes(item.name)
            
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleGroup(item.name)}
                  className={cn(
                    "flex w-full items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
                    isCollapsed && "justify-center"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isCollapsed ? "" : "mr-3",
                    item.color
                  )} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{item.name}</span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </>
                  )}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </button>
                
                {/* Submenu */}
                {!isCollapsed && isExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.children.map((child) => {
                      const isActive = pathname === child.href
                      const ChildIcon = child.icon
                      
                      return (
                        <Link
                          key={child.name}
                          href={child.href || '#'}
                          className={cn(
                            "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group relative",
                            isActive
                              ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-400"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                          )}
                        >
                          <ChildIcon className={cn(
                            "h-4 w-4 flex-shrink-0 mr-3",
                            child.color
                          )} />
                          <span className="truncate">{child.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }
          
          // Handle regular menu items
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.name}
              href={item.href || '#'}
              className={cn(
                "flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative",
                isActive
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-400"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className={cn(
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
      <div className="px-2 py-4 space-y-1">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className={cn(
            "flex w-full items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? "Toggle Theme" : undefined}
        >
          {theme === "dark" ? (
            <Sun className={cn(
              "h-5 w-5 flex-shrink-0 text-yellow-500",
              isCollapsed ? "" : "mr-3"
            )} />
          ) : (
            <Moon className={cn(
              "h-5 w-5 flex-shrink-0 text-indigo-500",
              isCollapsed ? "" : "mr-3"
            )} />
          )}
          {!isCollapsed && (
            <span className="flex-1 text-left truncate">Toggle Theme</span>
          )}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Toggle Theme
            </div>
          )}
        </button>
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoading}
          className={cn(
            "flex w-full items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className={cn(
            "h-5 w-5 flex-shrink-0 text-red-500",
            isCollapsed ? "" : "mr-3"
          )} />
          {!isCollapsed && (
            <span className="flex-1 text-left truncate">Logout</span>
          )}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Logout
            </div>
          )}
        </button>
        
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