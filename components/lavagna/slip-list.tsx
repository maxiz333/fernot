"use client"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "Adesso"
  if (minutes < 60) return `${minutes}m fa`
  if (hours < 24) return `${hours}h fa`
  if (days < 7) return `${days}g fa`
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
  }).format(date)
}

interface SlipListProps {
  onSlipSelect?: () => void
}

export function SlipList({ onSlipSelect }: SlipListProps) {
  const { activeSlipId, setActiveSlip, getFilteredSlips, shelves, searchQuery, isLoading } = useStore()
  
  const filteredSlips = getFilteredSlips()

  const getShelfName = (shelfId: string) => {
    return shelves.find((s) => s.id === shelfId)?.name || "Sconosciuto"
  }

  const getShelfEmoji = (shelfId: string) => {
    const shelf = shelves.find((s) => s.id === shelfId)
    if (!shelf) return "📁"
    const icons: Record<string, string> = {
      "file-text": "📄",
      "package": "📦",
      "users": "👥",
      "folder": "📁",
    }
    return icons[shelf.icon] || "📁"
  }

  if (filteredSlips.length === 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-gradient-to-b from-transparent to-secondary/20 p-8 text-center">
        <div>
          <div className="mx-auto h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <span className="text-3xl opacity-50">{isLoading ? "⏳" : searchQuery ? "🔍" : "📭"}</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {isLoading ? "Caricamento fogli..." : searchQuery ? "Nessun risultato trovato" : "Nessun foglio in questo scaffale"}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {isLoading ? "Sincronizzazione da Firestore in corso" : searchQuery ? "Prova con altre parole chiave" : "Crea il tuo primo foglio!"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      {filteredSlips.map((slip, index) => (
        <button
          key={slip.id}
          onClick={() => {
            setActiveSlip(slip.id)
            onSlipSelect?.()
          }}
          className={cn(
            "w-full px-4 py-4 text-left transition-all group relative",
            activeSlipId === slip.id
              ? "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-l-4 border-primary"
              : "hover:bg-muted/50 border-l-4 border-transparent",
            slip.isUrgent && activeSlipId !== slip.id && "bg-urgent/5",
            index !== filteredSlips.length - 1 && "border-b border-border"
          )}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={cn(
              "shrink-0 h-10 w-10 rounded-xl flex items-center justify-center text-lg transition-transform group-hover:scale-105",
              slip.isUrgent 
                ? "bg-gradient-to-br from-urgent/20 to-urgent/10" 
                : activeSlipId === slip.id
                  ? "bg-gradient-to-br from-primary/20 to-primary/10"
                  : "bg-muted/50"
            )}>
              {slip.isUrgent ? "🔥" : "📝"}
            </div>

            <div className="flex-1 min-w-0">
              {/* Title */}
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  "truncate font-semibold",
                  activeSlipId === slip.id ? "text-primary" : "text-foreground"
                )}>
                  {slip.title}
                </h3>
                {slip.isUrgent && (
                  <span className="shrink-0 text-[10px] font-bold text-urgent bg-urgent/10 px-1.5 py-0.5 rounded-full">
                    URGENTE
                  </span>
                )}
              </div>

              {/* Preview */}
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                {slip.content || "Foglio vuoto... ✏️"}
              </p>

              {/* Meta */}
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  {getShelfEmoji(slip.shelfId)} {getShelfName(slip.shelfId)}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span>🕐</span> {formatRelativeTime(slip.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
