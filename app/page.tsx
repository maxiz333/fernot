"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/lavagna/sidebar"
import { SlipList } from "@/components/lavagna/slip-list"
import { SlipEditor } from "@/components/lavagna/slip-editor"
import { QuickActions } from "@/components/lavagna/quick-actions"
import { SearchBar } from "@/components/lavagna/search-bar"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Menu, ChevronLeft, Sparkles, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function LavagnaPage() {
  const { activeSlipId, shelves, activeSidebarShelfId, slips, subscribeToSlips, isLoading } = useStore()
  const [mobileView, setMobileView] = useState<"sidebar" | "list" | "editor">("list")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarVisible, setDesktopSidebarVisible] = useState(true)
  const [desktopSlipListVisible, setDesktopSlipListVisible] = useState(true)

  const activeShelf = shelves.find((s) => s.id === activeSidebarShelfId)
  const urgentCount = slips.filter((s) => s.isUrgent).length

  useEffect(() => {
    const unsubscribe = subscribeToSlips()
    return () => unsubscribe()
  }, [subscribeToSlips])

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Top Bar with gradient */}
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-border bg-gradient-to-r from-primary/5 via-card to-accent/5 px-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          {/* Mobile Menu */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 lg:hidden hover:bg-primary/10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0" hiddenTitle="Navigazione lavagna">
              <Sidebar onSlipSelect={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDesktopSidebarVisible((prev) => !prev)}
            className="hidden shrink-0 lg:inline-flex hover:bg-primary/10"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Mostra o nascondi sidebar</span>
          </Button>

          {/* Logo */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
              <span className="text-xl">🔧</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground flex items-center gap-1">
                Lavagna
                <Sparkles className="h-4 w-4 text-amber" />
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Ferramenta Digitale</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mx-4 flex min-w-0 flex-1 max-w-md">
          <SearchBar />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDesktopSlipListVisible((prev) => !prev)}
          className="hidden shrink-0 sm:inline-flex hover:bg-primary/10"
        >
          {desktopSlipListVisible ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          <span className="sr-only">Mostra o nascondi lista fogli</span>
        </Button>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-secondary/80 px-3 py-1.5">
            <span className="text-sm">📋</span>
            <span className="text-xs font-medium text-secondary-foreground">{slips.length} fogli</span>
          </div>
          {urgentCount > 0 && (
            <div className="flex items-center gap-2 rounded-full bg-urgent/10 px-3 py-1.5 border border-urgent/20">
              <span className="text-sm">🔥</span>
              <span className="text-xs font-semibold text-urgent">{urgentCount} urgenti</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className={cn("hidden w-72 shrink-0 lg:block", !desktopSidebarVisible && "lg:hidden")}>
          <Sidebar />
        </div>

        {/* Middle Panel - Slip List */}
        <div
          className={cn(
            "min-h-0 w-full shrink-0 flex-col border-r border-border bg-card/50 backdrop-blur-sm sm:w-80",
            mobileView === "list" ? "flex" : "hidden",
            desktopSlipListVisible ? "sm:flex" : "sm:hidden"
          )}
        >
          {/* Panel Header */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-gradient-to-r from-transparent to-secondary/30 px-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">{activeShelf?.icon === "package" ? "📦" : activeShelf?.icon === "users" ? "👥" : activeShelf?.icon === "file-text" ? "📄" : "📂"}</span>
              <h2 className="text-sm font-semibold text-foreground">
                {activeShelf?.name || "Tutti i fogli"}
              </h2>
              {isLoading && <span className="text-[10px] text-muted-foreground">Caricamento...</span>}
            </div>
            {activeSlipId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileView("editor")}
                className="sm:hidden text-primary gap-1"
              >
                Apri
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </Button>
            )}
          </div>
          <div className="min-h-0 flex-1">
            <SlipList onSlipSelect={() => setMobileView("editor")} />
          </div>
        </div>

        {/* Right Panel - Editor */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 bg-gradient-to-br from-card via-card to-secondary/20",
            mobileView !== "editor" && "hidden sm:flex"
          )}
        >
          {/* Mobile: Back button */}
          <div className="flex h-12 items-center border-b border-border px-4 sm:hidden bg-card/80">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileView("list")}
              className="gap-1 text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Indietro
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <SlipEditor />
          </div>
        </div>
      </div>

      {/* Quick Actions FAB */}
      <QuickActions />
    </div>
  )
}
