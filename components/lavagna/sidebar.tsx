"use client"

import { useState } from "react"
import { useStore, type Slip } from "@/lib/store"
import { cn } from "@/lib/utils"
import {
  Plus,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const shelfEmojis: Record<string, string> = {
  "file-text": "📄",
  "package": "📦",
  "users": "👥",
  "folder": "📁",
}

const defaultEmojis = ["📁", "🔧", "⚙️", "🏠", "💡", "📐", "🔩", "🪵"]
const dateGroupLabels = {
  today: "Oggi",
  yesterday: "Ieri",
  lastWeek: "Settimana scorsa",
  older: "Precedenti",
} as const

type DateGroupKey = keyof typeof dateGroupLabels

function getDateGroup(date: Date): DateGroupKey {
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((startToday.getTime() - startTarget.getTime()) / 86400000)

  if (diffDays <= 0) return "today"
  if (diffDays === 1) return "yesterday"
  if (diffDays <= 7) return "lastWeek"
  return "older"
}

function groupSlipsByDate(slips: Slip[]) {
  const ordered: Record<DateGroupKey, Slip[]> = {
    today: [],
    yesterday: [],
    lastWeek: [],
    older: [],
  }

  for (const slip of [...slips].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())) {
    ordered[getDateGroup(slip.updatedAt)].push(slip)
  }

  return ordered
}

interface SidebarProps {
  onSlipSelect?: () => void
}

export function Sidebar({ onSlipSelect }: SidebarProps) {
  const {
    shelves,
    slips,
    activeSidebarShelfId,
    activeSlipId,
    setActiveSidebarShelf,
    setActiveSlip,
    addShelf,
    addSlip,
    getSlipsByShelf,
  } = useStore()

  const [newShelfName, setNewShelfName] = useState("")
  const [selectedEmoji, setSelectedEmoji] = useState("📁")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [expandedShelves, setExpandedShelves] = useState<Set<string>>(
    new Set(shelves.map((s) => s.id))
  )
  const [collapsedDateGroups, setCollapsedDateGroups] = useState<Set<string>>(new Set())

  const toggleShelf = (shelfId: string) => {
    setExpandedShelves((prev) => {
      const next = new Set(prev)
      if (next.has(shelfId)) {
        next.delete(shelfId)
      } else {
        next.add(shelfId)
      }
      return next
    })
  }

  const toggleDateGroup = (shelfId: string, groupKey: DateGroupKey) => {
    const key = `${shelfId}:${groupKey}`
    setCollapsedDateGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleAddShelf = () => {
    if (newShelfName.trim()) {
      addShelf(newShelfName.trim())
      setNewShelfName("")
      setSelectedEmoji("📁")
      setIsDialogOpen(false)
    }
  }

  const handleSlipClick = (slipId: string) => {
    setActiveSlip(slipId)
    onSlipSelect?.()
  }

  const handleAddSlip = async (shelfId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSlipId = await addSlip(shelfId)
    setActiveSlip(newSlipId)
    setExpandedShelves((prev) => new Set([...prev, shelfId]))
    onSlipSelect?.()
  }

  const getSlipCount = (shelfId: string) => {
    return slips.filter((s) => s.shelfId === shelfId).length
  }

  const getShelfEmoji = (icon: string) => {
    return shelfEmojis[icon] || "📁"
  }

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4 bg-gradient-to-r from-sidebar-primary/10 to-transparent">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗄️</span>
          <h2 className="text-sm font-bold text-sidebar-foreground">Scaffali</h2>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent rounded-lg"
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Aggiungi scaffale</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>✨</span> Nuovo Scaffale
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex flex-wrap gap-2">
                {defaultEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setSelectedEmoji(emoji)}
                    className={cn(
                      "h-10 w-10 rounded-lg text-xl transition-all",
                      selectedEmoji === emoji
                        ? "bg-primary/20 ring-2 ring-primary scale-110"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  placeholder="Nome scaffale..."
                  onKeyDown={(e) => e.key === "Enter" && handleAddShelf()}
                  autoFocus
                  className="flex-1"
                />
                <Button onClick={handleAddShelf} disabled={!newShelfName.trim()} className="gap-1">
                  <Sparkles className="h-4 w-4" />
                  Crea
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Shelves List */}
      <div className="flex-1 overflow-y-auto py-3">
        {/* All Slips Option */}
        <button
          onClick={() => setActiveSidebarShelf(null)}
          className={cn(
            "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-all rounded-r-xl mr-2",
            activeSidebarShelfId === null
              ? "bg-gradient-to-r from-sidebar-primary/20 to-sidebar-primary/5 text-sidebar-foreground border-l-4 border-sidebar-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <span className="text-lg">📋</span>
          <span className="flex-1 truncate font-semibold">Tutti i fogli</span>
          <span className="rounded-full bg-sidebar-accent px-2.5 py-1 text-xs font-bold text-sidebar-primary">
            {slips.length}
          </span>
        </button>

        <div className="my-3 mx-4 h-px bg-gradient-to-r from-sidebar-border via-sidebar-border to-transparent" />

        {/* Shelf Items */}
        {shelves.map((shelf, index) => {
          const shelfSlips = getSlipsByShelf(shelf.id)
          const slipsByDate = groupSlipsByDate(shelfSlips)
          const isExpanded = expandedShelves.has(shelf.id)
          const isActive = activeSidebarShelfId === shelf.id
          const urgentInShelf = shelfSlips.filter((s) => s.isUrgent).length

          return (
            <div key={shelf.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setActiveSidebarShelf(shelf.id)
                  toggleShelf(shelf.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setActiveSidebarShelf(shelf.id)
                    toggleShelf(shelf.id)
                  }
                }}
                className={cn(
                  "group flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-all rounded-r-xl mr-2",
                  isActive
                    ? "bg-gradient-to-r from-sidebar-primary/20 to-sidebar-primary/5 text-sidebar-foreground border-l-4 border-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                    isExpanded && "rotate-90"
                  )}
                />
                <span className="text-lg">{getShelfEmoji(shelf.icon)}</span>
                <span className="flex-1 truncate font-medium">{shelf.name}</span>
                {urgentInShelf > 0 && (
                  <span className="text-xs">🔥</span>
                )}
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  isActive ? "bg-sidebar-primary/20 text-sidebar-primary" : "bg-sidebar-accent text-muted-foreground"
                )}>
                  {getSlipCount(shelf.id)}
                </span>
                <button
                  onClick={(e) => {
                    void handleAddSlip(shelf.id, e)
                  }}
                  className="ml-1 opacity-0 transition-opacity group-hover:opacity-100 hover:scale-110"
                >
                  <Plus className="h-4 w-4 text-sidebar-primary" />
                </button>
              </div>

              {/* Slips inside shelf */}
              {isExpanded && shelfSlips.length > 0 && (
                <div className="pb-2 space-y-0.5">
                  {(Object.keys(dateGroupLabels) as DateGroupKey[]).map((groupKey) => {
                    const slipsInGroup = slipsByDate[groupKey]
                    if (slipsInGroup.length === 0) return null
                    const groupId = `${shelf.id}:${groupKey}`
                    const isGroupExpanded = !collapsedDateGroups.has(groupId)

                    return (
                      <div key={`${shelf.id}-${groupKey}`} className="space-y-0.5">
                        <button
                          onClick={() => toggleDateGroup(shelf.id, groupKey)}
                          className="flex w-full items-center gap-1 px-4 py-1 pl-14 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 hover:text-foreground"
                        >
                          <ChevronRight className={cn("h-3 w-3 transition-transform", isGroupExpanded && "rotate-90")} />
                          <span>{dateGroupLabels[groupKey]}</span>
                          <span className="ml-auto text-[9px] text-muted-foreground/80">{slipsInGroup.length}</span>
                        </button>
                        {isGroupExpanded &&
                          slipsInGroup.map((slip) => (
                            <button
                              key={slip.id}
                              onClick={() => handleSlipClick(slip.id)}
                              className={cn(
                                "group flex w-full items-center gap-2 py-2 pl-14 pr-4 text-left text-sm transition-all",
                                activeSlipId === slip.id
                                  ? "bg-sidebar-primary/10 text-sidebar-primary font-medium"
                                  : "text-muted-foreground hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
                              )}
                            >
                              <span className="text-xs">{slip.isUrgent ? "🔴" : "⚪"}</span>
                              <span className="flex-1 truncate">{slip.title}</span>
                            </button>
                          ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4 bg-gradient-to-t from-sidebar-accent/30 to-transparent">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>💡</span>
          <span>Suggerimento: usa i modelli rapidi!</span>
        </div>
      </div>
    </aside>
  )
}
