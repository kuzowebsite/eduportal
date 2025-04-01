"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  FileText,
  PlusCircle,
  Users,
  Settings,
  Trophy,
  LayoutDashboard,
  ChevronRight,
  ChevronLeft,
  Menu,
} from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

// Контекст нужно вынести за пределы компонента AdminSidebar
// Создаем контекст для управления состоянием сайдбара
import { createContext, useContext } from "react"

interface SidebarContextType {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

// Создаем отдельный компонент SidebarProvider
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  // Check for saved state in localStorage when component mounts
  useEffect(() => {
    const savedState = localStorage.getItem("adminSidebarCollapsed")
    if (savedState !== null) {
      setCollapsed(savedState === "true")
    }
  }, [])

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("adminSidebarCollapsed", String(collapsed))

    // Dispatch a custom event to notify other components
    const event = new CustomEvent("sidebarStateChange", {
      detail: { collapsed },
    })
    window.dispatchEvent(event)
  }, [collapsed])

  const toggleSidebar = () => setCollapsed(!collapsed)

  // Provide context value
  const contextValue = {
    collapsed,
    setCollapsed,
    toggleSidebar,
  }

  return <SidebarContext.Provider value={contextValue}>{children}</SidebarContext.Provider>
}

interface SidebarItemProps {
  icon: React.ReactNode
  label: string
  href: string
  active?: boolean
  collapsed: boolean
}

// Обновляем компонент SidebarItem для обработки кликов
const SidebarItem = ({ icon, label, href, active, collapsed }: SidebarItemProps) => {
  const { toggleSidebar } = useSidebar()

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-3 text-sm transition-colors rounded-md",
        active ? "bg-cyan-900/40 text-cyan-400" : "text-gray-400 hover:text-cyan-400 hover:bg-cyan-900/20",
      )}
      onClick={(e) => {
        if (collapsed) {
          e.preventDefault() // Prevent navigation when collapsed
          toggleSidebar() // Expand sidebar first
        }
      }}
    >
      <div className="flex-shrink-0">{icon}</div>
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {active && <ChevronRight className="ml-auto h-4 w-4" />}
        </>
      )}
    </Link>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  const { collapsed, toggleSidebar } = useSidebar()

  return (
    <div
      className={cn(
        "h-screen bg-[#0f1520] border-r border-border/10 fixed left-0 top-0 z-30 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
      onClick={() => collapsed && toggleSidebar()} // Expand when clicking on collapsed sidebar
    >
      <div className="p-4 border-b border-border/10 flex items-center justify-between">
        {!collapsed && (
          <div>
            <h2 className="text-xl font-bold text-white">Номын Портал</h2>
            <p className="text-xs text-cyan-400">Админ панель</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("text-gray-400 hover:text-white", collapsed && "mx-auto")}
          onClick={(e) => {
            e.stopPropagation() // Prevent triggering the parent div's onClick
            toggleSidebar()
          }}
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        <SidebarItem
          icon={<LayoutDashboard className="h-5 w-5" />}
          label="Dashboard"
          href="/admin/dashboard"
          active={pathname === "/admin/dashboard"}
          collapsed={collapsed}
        />

        <SidebarItem
          icon={<FileText className="h-5 w-5" />}
          label="Шалгалтуудыг харах"
          href="/admin/tests"
          active={pathname === "/admin/tests"}
          collapsed={collapsed}
        />

        <SidebarItem
          icon={<PlusCircle className="h-5 w-5" />}
          label="Шинэ шалгалт нэмэх"
          href="/admin/tests/new"
          active={pathname === "/admin/tests/new"}
          collapsed={collapsed}
        />

        <SidebarItem
          icon={<Users className="h-5 w-5" />}
          label="Хэрэглэгчдийг харах"
          href="/admin/users"
          active={pathname === "/admin/users"}
          collapsed={collapsed}
        />

        <SidebarItem
          icon={<Settings className="h-5 w-5" />}
          label="Сайтын тохиргоо"
          href="/admin/settings"
          active={pathname === "/admin/settings"}
          collapsed={collapsed}
        />

        <SidebarItem
          icon={<Trophy className="h-5 w-5" />}
          label="Ранк харах"
          href="/admin/rank"
          active={pathname === "/admin/rank"}
          collapsed={collapsed}
        />
      </div>

      <div
        className={cn(
          "p-4 border-t border-border/10 flex items-center",
          collapsed ? "justify-center" : "justify-start gap-3",
        )}
      >
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white">N</div>
        {!collapsed && <div className="text-xs text-gray-500">Номын Портал</div>}
      </div>
    </div>
  )
}

